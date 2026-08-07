import express from "express";

import { authenticate } from "../middleware/auth.js";
import {
  createRazorpayOrder,
  getPlan,
  PLANS,
  verifyPaymentSignature,
  verifyWebhookSignature,
} from "../razorpay.js";
import { supabase } from "../supabase.js";
import { logger, sendToBetterStack } from "../utils/logger.js";

const router = express.Router();

/**
 * Payment lifecycle:
 *   created  -> order created on Razorpay, awaiting payment
 *   paid     -> signature verified (or webhook confirmed capture)
 *   failed   -> verification failed or the payment failed/cancelled
 */
const PAYMENT_STATUS = Object.freeze({
  CREATED: "created",
  PAID: "paid",
  FAILED: "failed",
});

// =====================================
// Create Payment Order (authenticated)
// =====================================
router.post("/order", authenticate, async (req, res) => {
  const { planId } = req.body || {};
  const plan = getPlan(planId);

  if (!plan) {
    const err = new Error("Invalid or missing planId");
    err.status = 400;
    throw err;
  }

  const userId = req.user.id;

  // Duplicate purchase guard: user already paid for this plan
  const { data: paidRows, error: paidError } = await supabase
    .from("payments")
    .select("id")
    .eq("user_id", userId)
    .eq("plan_id", plan.id)
    .eq("status", PAYMENT_STATUS.PAID)
    .limit(1);

  if (paidError) throw paidError;

  if (paidRows && paidRows.length > 0) {
    await sendToBetterStack("warning", "PAYMENT_DUPLICATE_ATTEMPT", {
      userId,
      planId: plan.id,
    });
    const err = new Error("You have already purchased this plan");
    err.status = 409;
    throw err;
  }

  // Reuse an existing pending (created) order for this plan so rapid
  // double-clicks never create duplicate Razorpay orders.
  const { data: pendingRows } = await supabase
    .from("payments")
    .select("*")
    .eq("user_id", userId)
    .eq("plan_id", plan.id)
    .eq("status", PAYMENT_STATUS.CREATED)
    .order("created_at", { ascending: false })
    .limit(1);

  if (pendingRows && pendingRows.length > 0) {
    const pending = pendingRows[0];
    await sendToBetterStack("info", "PAYMENT_ORDER_REUSED", {
      orderId: pending.razorpay_order_id,
      userId,
      planId: plan.id,
    });
    return res.json({
      success: true,
      reused: true,
      orderId: pending.razorpay_order_id,
      amount: pending.amount,
      currency: pending.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      plan,
    });
  }

  let order;
  try {
    order = await createRazorpayOrder({
      planId: plan.id,
      userId,
      email: req.user.email,
    });
  } catch (error) {
    await sendToBetterStack("error", "PAYMENT_ORDER_CREATION_FAILED", {
      error: error.message,
      userId,
      planId: plan.id,
    });
    throw error;
  }

  // Persist a pending payment row (fail closed: if we cannot record the
  // order, do not hand it to the client).
  const { data: paymentRow, error: insertError } = await supabase
    .from("payments")
    .insert({
      user_id: userId,
      razorpay_order_id: order.orderId,
      plan_id: plan.id,
      amount: order.amount,
      currency: order.currency,
      status: PAYMENT_STATUS.CREATED,
    })
    .select();

  if (insertError) {
    await sendToBetterStack("error", "PAYMENT_DATABASE_SAVE_FAILED", {
      error: insertError.message,
      orderId: order.orderId,
      userId,
    });
    throw insertError;
  }

  await sendToBetterStack("info", "PAYMENT_INITIATED", {
    orderId: order.orderId,
    userId,
    planId: plan.id,
  });

  res.json({
    success: true,
    orderId: order.orderId,
    amount: order.amount,
    currency: order.currency,
    keyId: process.env.RAZORPAY_KEY_ID,
    plan,
  });
});

// =====================================
// Verify Payment (authenticated)
// =====================================
router.post("/verify", authenticate, async (req, res) => {
  const {
    razorpay_order_id: orderId,
    razorpay_payment_id: paymentId,
    razorpay_signature: signature,
  } = req.body || {};

  if (!orderId || !paymentId || !signature) {
    const err = new Error("Missing payment verification details");
    err.status = 400;
    throw err;
  }

  const { data: paymentRows, error: selectError } = await supabase
    .from("payments")
    .select("*")
    .eq("razorpay_order_id", orderId)
    .eq("user_id", req.user.id)
    .limit(1);

  if (selectError) throw selectError;

  const payment = paymentRows && paymentRows[0];

  if (!payment) {
    const err = new Error("Payment order not found");
    err.status = 404;
    throw err;
  }

  // Idempotent: a verified payment must never be re-processed.
  if (payment.status === PAYMENT_STATUS.PAID) {
    await sendToBetterStack("info", "PAYMENT_ALREADY_PROCESSED", {
      orderId,
      userId: req.user.id,
    });
    return res.json({ success: true, alreadyProcessed: true, payment });
  }

  const valid = verifyPaymentSignature({ orderId, paymentId, signature });

  if (!valid) {
    await sendToBetterStack("error", "PAYMENT_VERIFICATION_FAILED", {
      orderId,
      paymentId,
      userId: req.user.id,
    });

    await supabase
      .from("payments")
      .update({
        status: PAYMENT_STATUS.FAILED,
        razorpay_payment_id: paymentId,
      })
      .eq("id", payment.id);

    const err = new Error("Payment signature verification failed");
    err.status = 400;
    throw err;
  }

  const { data: updated, error: updateError } = await supabase
    .from("payments")
    .update({
      status: PAYMENT_STATUS.PAID,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
    })
    .eq("id", payment.id)
    .select();

  if (updateError) throw updateError;

  await sendToBetterStack("info", "PAYMENT_SUCCESS", {
    orderId,
    paymentId,
    amount: payment.amount,
    currency: payment.currency,
    userId: req.user.id,
    planId: payment.plan_id,
  });

  res.json({ success: true, payment: updated[0] });
});

// =====================================
// Report Failed Payment (authenticated)
// =====================================
router.post("/failed", authenticate, async (req, res) => {
  const {
    razorpay_order_id: orderId,
    razorpay_payment_id: paymentId,
    code,
    description,
  } = req.body || {};

  if (!orderId) {
    const err = new Error("Missing razorpay_order_id");
    err.status = 400;
    throw err;
  }

  const { data: paymentRows, error: selectError } = await supabase
    .from("payments")
    .select("*")
    .eq("razorpay_order_id", orderId)
    .eq("user_id", req.user.id)
    .limit(1);

  if (selectError) throw selectError;

  const payment = paymentRows && paymentRows[0];

  if (!payment) {
    const err = new Error("Payment order not found");
    err.status = 404;
    throw err;
  }

  if (payment.status === PAYMENT_STATUS.PAID) {
    return res.json({ success: true, alreadyProcessed: true });
  }

  await supabase
    .from("payments")
    .update({
      status: PAYMENT_STATUS.FAILED,
      razorpay_payment_id: paymentId || payment.razorpay_payment_id,
    })
    .eq("id", payment.id);

  await sendToBetterStack("warning", "PAYMENT_FAILED", {
    orderId,
    paymentId,
    code,
    description,
    userId: req.user.id,
  });

  res.json({ success: true });
});

// =====================================
// List payments + active plan (authenticated)
// =====================================
router.get("/", authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("user_id", req.user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const activePlan =
    (data && data.find((p) => p.status === PAYMENT_STATUS.PAID)) || null;

  res.json({ success: true, payments: data || [], activePlan });
});

// =====================================
// Razorpay Webhook (server-to-server)
// =====================================
router.post("/webhook", async (req, res) => {
  const signature = req.headers["x-razorpay-signature"];

  if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
    await sendToBetterStack("error", "RAZORPAY_WEBHOOK_SECRET_MISSING", {});
    return res.status(501).json({ error: "Webhook not configured" });
  }

  if (!verifyWebhookSignature(req.rawBody, signature)) {
    await sendToBetterStack("error", "PAYMENT_WEBHOOK_VERIFICATION_FAILED", {});
    return res.status(400).json({ error: "Invalid webhook signature" });
  }

  const event = req.body;
  const eventName = event.event;
  const entity =
    (event.payload && event.payload.payment && event.payload.payment.entity) ||
    (event.payload && event.payload.order && event.payload.order.entity);

  try {
    if (eventName === "payment.captured" && entity && entity.order_id) {
      await supabase
        .from("payments")
        .update({
          status: PAYMENT_STATUS.PAID,
          razorpay_payment_id: entity.id,
        })
        .eq("razorpay_order_id", entity.order_id);

      await sendToBetterStack("info", "PAYMENT_SUCCESS", {
        orderId: entity.order_id,
        paymentId: entity.id,
        source: "webhook",
      });
    } else if (eventName === "payment.failed" && entity && entity.order_id) {
      await supabase
        .from("payments")
        .update({
          status: PAYMENT_STATUS.FAILED,
          razorpay_payment_id: entity.id,
        })
        .eq("razorpay_order_id", entity.order_id);

      await sendToBetterStack("warning", "PAYMENT_FAILED", {
        orderId: entity.order_id,
        paymentId: entity.id,
        source: "webhook",
      });
    }
  } catch (error) {
    logger.error({ error: error.message }, "Webhook processing failed");
  }

  res.json({ received: true });
});

export default router;
