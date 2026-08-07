/**
 * Razorpay checkout integration for MV3 Chrome extensions.
 *
 * The MV3 `extension_pages` CSP only allows `script-src 'self'` and forbids
 * `unsafe-eval`. Razorpay's checkout.js both runs `new Function("return this")`
 * at startup and (in a self-hosted build) cannot be trusted to stay
 * self-contained, so it can never run in a normal extension page.
 *
 * Instead the checkout runs inside a manifest-declared *sandbox page*
 * (`sandbox/checkout.html`), whose CSP explicitly permits remote scripts and
 * `unsafe-eval`. The sandbox drives `new Razorpay(options).open()` and reports
 * the outcome back to this frame via `postMessage`.
 *
 * Returns a Promise that resolves with one of:
 *   { success: true,   razorpay_order_id, razorpay_payment_id, razorpay_signature }
 *   { success: false,  dismissed: true }
 *   { success: false,  failed: true, code, description, order_id, payment_id }
 */
export function openRazorpayCheckout(options) {
  return new Promise((resolve) => {
    if (
      typeof chrome === "undefined" ||
      !chrome.runtime ||
      !chrome.runtime.getURL
    ) {
      resolve({
        success: false,
        dismissed: true,
      });
      return;
    }

    const nonce = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const iframe = document.createElement("iframe");
    iframe.src = chrome.runtime.getURL("sandbox/checkout.html");
    iframe.setAttribute(
      "sandbox",
      "allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
    );
    iframe.style.cssText =
      "position: fixed; inset: 0; width: 100%; height: 100%; border: 0; z-index: 2147483647;";

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
      if (event.source !== iframe.contentWindow) return;
      const msg = event.data;
      if (!msg || msg.nonce !== nonce) return;

      if (msg.type === "checkout.success") {
        const p = msg.payload || {};
        finish({
          success: true,
          razorpay_order_id: p.razorpay_order_id,
          razorpay_payment_id: p.razorpay_payment_id,
          razorpay_signature: p.razorpay_signature,
        });
      } else if (msg.type === "checkout.failed") {
        const err =
          (msg.payload && msg.payload.error) || {};
        const meta = (err.metadata || {});
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

    iframe.addEventListener("load", () => {
      try {
        iframe.contentWindow.postMessage(
          { type: "init", nonce, options },
          "*"
        );
      } catch (error) {
        finish({ success: false, failed: true });
      }
    });

    document.body.appendChild(iframe);
  });
}
