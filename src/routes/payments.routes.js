import { Router } from "express";
import { getDB } from "../config/db.js";
import { getPriceForRole, getStripe, isStripeConfigured } from "../config/stripe.js";
import { verifyToken } from "../middleware/auth.js";
import { processCheckoutSession } from "../services/payments.service.js";
import { ApiError, asyncHandler, sendSuccess, serialize, toObjectId } from "../utils/http.js";

const router = Router();

// POST /api/payments/checkout — server decides price based on the user's role
router.post(
  "/checkout",
  verifyToken,
  asyncHandler(async (req, res) => {
    const db = getDB();
    const user = req.user;
    const price = getPriceForRole(user.role);

    if (user.plan === "pro") {
      throw new ApiError(400, "Your account is already on the Pro plan");
    }

    const stripe = getStripe();
    const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user.email,
      client_reference_id: user.id,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: price.amount,
            product_data: {
              name: `MentorLagbe ${price.label}`,
              description:
                user.role === "tutor"
                  ? "Unlimited tuition posts and priority applicant management."
                  : "Unlimited applications and priority support.",
            },
          },
        },
      ],
      metadata: {
        userId: user.id,
        userEmail: user.email,
        userName: user.name,
        userRole: user.role,
        planName: price.planName,
        amount: String(price.amount),
      },
      success_url: `${clientUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${clientUrl}/payment/cancel`,
    });

    return sendSuccess(res, { url: session.url, sessionId: session.id });
  })
);

// GET /api/payments/verify-session?session_id=cs_...
router.get(
  "/verify-session",
  verifyToken,
  asyncHandler(async (req, res) => {
    const sessionId = String(req.query.session_id || "").trim();
    if (!sessionId.startsWith("cs_")) {
      throw new ApiError(400, "A valid Stripe checkout session id is required");
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.metadata?.userEmail !== req.user.email) {
      throw new ApiError(403, "This payment does not belong to your account");
    }

    const result = await processCheckoutSession(session);
    return sendSuccess(res, {
      plan: "pro",
      alreadyProcessed: result.alreadyProcessed,
      payment: serialize(result.payment),
    });
  })
);

// GET /api/payments/mine
router.get(
  "/mine",
  verifyToken,
  asyncHandler(async (req, res) => {
    const db = getDB();
    const payments = await db
      .collection("payments")
      .find({ userEmail: req.user.email })
      .sort({ paidAt: -1 })
      .toArray();
    return sendSuccess(res, payments.map(serialize));
  })
);

/**
 * Stripe webhook handler. Must be mounted with express.raw({ type: "application/json" })
 * before the global express.json() middleware.
 */
export async function stripeWebhookHandler(req, res, next) {
  try {
    if (!isStripeConfigured() || !process.env.STRIPE_WEBHOOK_SECRET) {
      return res
        .status(503)
        .json({ success: false, message: "Stripe webhook is not configured" });
    }

    const signature = req.headers["stripe-signature"];
    if (!signature) {
      return res
        .status(400)
        .json({ success: false, message: "Missing Stripe signature" });
    }

    let event;
    try {
      event = getStripe().webhooks.constructEvent(
        req.body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (error) {
      return res
        .status(400)
        .json({ success: false, message: `Webhook signature verification failed: ${error.message}` });
    }

    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      await processCheckoutSession(event.data.object);
    }

    return res.json({ received: true });
  } catch (error) {
    return next(error);
  }
}

// Admin-safe helper endpoint used by the dashboard profile to refresh plan state.
router.get(
  "/status",
  verifyToken,
  asyncHandler(async (req, res) => {
    const db = getDB();
    const user = await db
      .collection("users")
      .findOne({ _id: toObjectId(req.user.id) }, { projection: { plan: 1 } });
    return sendSuccess(res, { plan: user?.plan || "free" });
  })
);

export default router;
