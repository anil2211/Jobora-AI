import { API_URL } from "../config";

/**
 * Razorpay checkout integration for MV3 Chrome extensions.
 *
 * checkout.js cannot run inside an extension page (extension_pages CSP forbids
 * remote scripts and unsafe-eval) and fails inside a sandboxed page (origin
 * "null" breaks Razorpay's CORS). Instead, the backend hosts a checkout page
 * at `${API_URL}/checkout` — a normal https origin — which this function
 * embeds in an iframe over the side panel. The page runs checkout.js exactly
 * like a merchant website and reports the outcome via postMessage.
 *
 * Returns a Promise that resolves with one of:
 *   { success: true,   razorpay_order_id, razorpay_payment_id, razorpay_signature }
 *   { success: false,  dismissed: true }
 *   { success: false,  failed: true, code, description, order_id, payment_id }
 */
export function openRazorpayCheckout(options) {
  return new Promise((resolve) => {
    const params = new URLSearchParams({
      key: options.key || "",
      order_id: options.order_id || "",
      amount: options.amount || "",
      currency: options.currency || "INR",
      name: options.name || "",
      description: options.description || "",
      email: (options.prefill && options.prefill.email) || "",
    });

    const iframe = document.createElement("iframe");
    iframe.src = `${API_URL}/checkout?${params.toString()}`;
    iframe.style.cssText =
      "position: fixed; inset: 0; width: 100%; height: 100%; border: 0; z-index: 2147483647; background: #fff;";

    let settled = false;

    function finish(outcome) {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(outcome);
    }

    function cleanup() {
      window.removeEventListener("message", onMessage);
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    }

    function onMessage(event) {
      // Only trust messages from our own checkout page.
      if (event.origin !== API_URL) return;
      if (event.source !== iframe.contentWindow) return;

      const msg = event.data;
      if (!msg || !msg.type) return;

      if (msg.type === "checkout.success") {
        const p = msg.payload || {};
        finish({
          success: true,
          razorpay_order_id: p.razorpay_order_id,
          razorpay_payment_id: p.razorpay_payment_id,
          razorpay_signature: p.razorpay_signature,
        });
      } else if (msg.type === "checkout.failed") {
        const err = (msg.payload && msg.payload.error) || {};
        const meta = err.metadata || {};
        finish({
          success: false,
          failed: true,
          code: err.code,
          description: err.description,
          order_id: meta.order_id,
          payment_id: meta.payment_id,
        });
      } else if (msg.type === "checkout.dismissed") {
        finish({ success: false, dismissed: true });
      } else if (msg.type === "checkout.error") {
        finish({ success: false, failed: true });
      }
    }

    window.addEventListener("message", onMessage);
    document.body.appendChild(iframe);
  });
}
