import crypto from "node:crypto";
import Razorpay from "razorpay";

import { sendToBetterStack } from "./utils/logger.js";

/**
 * ----------------------------------------
 * Razorpay Client (server-side only)
 * ----------------------------------------
 * Key ID / Key Secret must NEVER be exposed to the frontend or Chrome
 * extension. The extension only ever receives the public Key ID inside
 * the order-creation response.
 */
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * ----------------------------------------
 * Plans
 * ----------------------------------------
 * Amounts are in the currency's smallest unit (paise for INR).
 * The client only sends a planId — amounts are always read from here
 * so the client can never tamper with the price.
 */
export const PLANS = Object.freeze({
  pro: Object.freeze({
    id: "pro",
    name: "Job Saver Pro",
    description: "Unlimited job saves, AI extraction and Google Sheets sync",
    amount: 29900, // ₹299.00
    currency: "INR",
  }),
});

export function getPlan(planId) {
  return PLANS[planId] || null;
}

/**
 * ----------------------------------------
 * Create a Razorpay Order
 * ----------------------------------------
 */
export async function createRazorpayOrder({ planId, userId, email }) {
  const plan = getPlan(planId);

  if (!plan) {
    const err = new Error("Invalid plan");
    err.status = 400;
    throw err;
  }

  const shortUserId = userId.replace(/[^a-z0-9]/gi, "").slice(0, 8);

  const order = await razorpay.orders.create({
    amount: plan.amount,
    currency: plan.currency,
    receipt: `job_saver_${shortUserId}_${Date.now()}`,
    notes: {
      plan_id: plan.id,
      user_id: userId,
      email: email || "",
    },
  });

  await sendToBetterStack("info", "PAYMENT_ORDER_CREATED", {
    orderId: order.id,
    planId: plan.id,
    amount: order.amount,
    currency: order.currency,
    userId,
  });

  return {
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    plan,
  };
}

/**
 * ----------------------------------------
 * Verify payment signature (server-side)
 * ----------------------------------------
 * Razorpay signs `order_id|payment_id` with your Key Secret using
 * HMAC-SHA256. Verification MUST happen on the backend so a client can
 * never forge a successful payment.
 */
export function verifyPaymentSignature({ orderId, paymentId, signature }) {
  if (!orderId || !paymentId || !signature) return false;

  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  return expected === signature;
}

/**
 * ----------------------------------------
 * Verify webhook signature
 * ----------------------------------------
 * Webhooks are signed over the raw request body using the Webhook Secret.
 */
export function verifyWebhookSignature(rawBody, signature) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!secret || !signature || !rawBody) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  return expected === signature;
}

export default razorpay;

/**
 * ----------------------------------------
 * Normalize an error for logging
 * ----------------------------------------
 * Razorpay errors often carry their details in `error.error.description`
 * with an empty top-level `message`, so log everything meaningful.
 */
export function describeError(error) {
  return {
    message: (error && error.message) || null,
    statusCode: (error && error.statusCode) || null,
    code: (error && error.code) || null,
    description:
      (error &&
        error.error &&
        (error.error.description || error.error.reason || error.error.field)) ||
      null,
  };
}
