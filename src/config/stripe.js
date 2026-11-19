import Stripe from "stripe";
import { ApiError } from "../utils/http.js";

let stripeClient = null;

export const PLAN_PRICES = {
  tutor: { planName: "pro", amount: 1500, label: "Tutor Pro" },
  student: { planName: "pro", amount: 1000, label: "Student Pro" },
};

export function isStripeConfigured() {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_SECRET_KEY.startsWith("sk_")
  );
}

export function getStripe() {
  if (!isStripeConfigured()) {
    throw new ApiError(
      503,
      "Stripe is not configured. Add STRIPE_SECRET_KEY to the server environment."
    );
  }
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeClient;
}

export function getPriceForRole(role) {
  const price = PLAN_PRICES[role];
  if (!price) {
    throw new ApiError(403, "Only students and tutors can upgrade to Pro.");
  }
  return price;
}
