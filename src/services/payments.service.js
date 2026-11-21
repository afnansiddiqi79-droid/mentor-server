import { getDB } from "../config/db.js";
import { ApiError } from "../utils/http.js";

/**
 * Persists a verified Stripe Checkout session exactly once and upgrades the
 * matching user to Pro. Safe to call from both the webhook and the success
 * page verification endpoint.
 */
export async function processCheckoutSession(session) {
  const db = getDB();
  const payments = db.collection("payments");

  if (!session || session.object !== "checkout.session") {
    throw new ApiError(400, "Invalid checkout session");
  }

  const existing = await payments.findOne({ stripeSessionId: session.id });
  if (existing) {
    // A previous attempt may have stored the payment but crashed before the
    // user document was upgraded (or the upgrade was rolled back). Fulfilment
    // is idempotent, so re-apply the upgrade instead of returning early.
    await db.collection("users").updateOne(
      { email: existing.userEmail },
      { $set: { plan: "pro", updatedAt: new Date() } }
    );
    return { payment: existing, alreadyProcessed: true };
  }

  if (session.payment_status !== "paid") {
    throw new ApiError(400, "Payment has not been completed yet");
  }

  const metadata = session.metadata || {};
  const expectedAmount = Number(metadata.amount);
  if (!Number.isFinite(expectedAmount) || expectedAmount !== session.amount_total) {
    throw new ApiError(400, "Payment amount does not match the selected plan");
  }

  const userEmail = metadata.userEmail;
  const userName = metadata.userName || "";
  const userRole = metadata.userRole;

  if (!userEmail || !["student", "tutor"].includes(userRole)) {
    throw new ApiError(400, "Payment is missing user information");
  }

  const user = await db.collection("users").findOne({ email: userEmail });
  if (!user) throw new ApiError(404, "The paying account no longer exists");

  const doc = {
    userId: metadata.userId || user._id.toString(),
    userEmail,
    userName,
    userRole,
    planName: metadata.planName || "pro",
    amount: session.amount_total / 100,
    currency: session.currency || "usd",
    transactionId: session.payment_intent || session.id,
    stripeSessionId: session.id,
    paymentStatus: "paid",
    paidAt: new Date(),
  };

  try {
    await payments.insertOne(doc);
  } catch (error) {
    if (error?.code === 11000) {
      const duplicate = await payments.findOne({ stripeSessionId: session.id });
      await db.collection("users").updateOne(
        { email: userEmail },
        { $set: { plan: "pro", updatedAt: new Date() } }
      );
      return { payment: duplicate, alreadyProcessed: true };
    }
    throw error;
  }

  await db.collection("users").updateOne(
    { email: userEmail },
    { $set: { plan: "pro", updatedAt: new Date() } }
  );

  return { payment: doc, alreadyProcessed: false };
}
