import React, { useCallback, useEffect, useState } from "react";

import {
  createPaymentOrder,
  getPayments,
  reportPaymentFailed,
  verifyPayment,
} from "../../api";
import { useUI } from "../../context/UIContext";
import { loadRazorpayCheckout } from "../../utils/razorpay";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import Card from "../ui/Card";

const PLAN = {
  id: "pro",
  name: "Job Saver Pro",
  price: "₹299",
  features: [
    "Unlimited job saves",
    "AI job extraction",
    "Google Sheets sync",
  ],
};

function formatAmount(amountPaise) {
  return `₹${(amountPaise / 100).toFixed(2)}`;
}

function statusColor(status) {
  if (status === "paid") return "text-green-600 font-medium";
  if (status === "failed") return "text-red-500 font-medium";
  return "text-amber-500 font-medium";
}

export default function PaymentsPanel({ user }) {
  const { addToast } = useUI();
  const [payments, setPayments] = useState([]);
  const [activePlan, setActivePlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPayments();
      setPayments(data.payments || []);
      setActivePlan(data.activePlan);
    } catch (error) {
      addToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (user) {
      refresh();
    } else {
      setPayments([]);
      setActivePlan(null);
    }
  }, [user, refresh]);

  async function handleSubscribe() {
    setProcessing(true);
    try {
      const data = await createPaymentOrder(PLAN.id);

      const Razorpay = await loadRazorpayCheckout();

      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: PLAN.name,
        description: "Unlimited job saves + Google Sheets sync",
        order_id: data.orderId,
        prefill: {
          email: (user && user.email) || "",
          name: (user && user.name) || "",
        },
        theme: { color: "#2563eb" },
        handler: async (response) => {
          try {
            await verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            addToast("Payment successful! Pro is now active.", "success");
            refresh();
          } catch (error) {
            addToast(error.message || "Payment verification failed", "error");
          }
        },
        modal: {
          ondismiss: () => {
            addToast("Payment cancelled. No charge was made.", "warning");
          },
        },
      };

      const rzp = new Razorpay(options);

      rzp.on("payment.failed", async (response) => {
        const err = (response && response.error) || {};
        try {
          await reportPaymentFailed({
            razorpay_order_id: err.metadata && err.metadata.order_id,
            razorpay_payment_id: err.metadata && err.metadata.payment_id,
            code: err.code,
            description: err.description,
          });
        } catch (reportError) {
          // Logging the failure is best-effort; always show the user the error.
          console.error("Failed to report payment error:", reportError);
        }
        addToast("Payment failed. Please try again.", "error");
      });

      rzp.open();
    } catch (error) {
      addToast(error.message || "Unable to start payment", "error");
    } finally {
      setProcessing(false);
    }
  }

  const subscribed = Boolean(activePlan);

  return (
    <Card className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-800">{PLAN.name}</h3>
          <p className="text-xs text-slate-500">{PLAN.price} · one-time payment</p>
        </div>
        {subscribed ? (
          <Badge variant="success">Active</Badge>
        ) : (
          <Badge>Free</Badge>
        )}
      </div>

      <ul className="space-y-1 mb-4">
        {PLAN.features.map((feature) => (
          <li
            key={feature}
            className="text-xs text-slate-600 flex items-center gap-1.5"
          >
            <span className="text-green-600">✓</span>
            {feature}
          </li>
        ))}
      </ul>

      <Button
        onClick={handleSubscribe}
        isLoading={processing}
        disabled={subscribed || !user || loading}
        className="w-full"
      >
        {subscribed
          ? "Subscribed"
          : user
            ? "Subscribe Now"
            : "Login to subscribe"}
      </Button>

      {payments.length > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-100">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Payment History
          </p>
          <ul className="space-y-1.5">
            {payments.slice(0, 5).map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between text-xs"
              >
                <span className="text-slate-500 truncate">
                  {formatAmount(p.amount)} · {p.plan_id} ·{" "}
                  {new Date(p.created_at).toLocaleDateString()}
                </span>
                <span className={statusColor(p.status)}>{p.status}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
