/**
 * Razorpay checkout page served at GET /checkout.
 *
 * The Chrome extension embeds this page in an iframe. Because it is a normal
 * https page (no extension CSP, real origin), Razorpay's checkout.js can load
 * its dynamic chunks (e.g. cdn.razorpay.com risk-detection) and its XHR to
 * api.razorpay.com passes CORS — exactly like any merchant website.
 *
 * The page drives the checkout and reports the outcome back to the embedding
 * frame via postMessage:
 *   { type: "checkout.success", payload: {razorpay_order_id, razorpay_payment_id, razorpay_signature} }
 *   { type: "checkout.failed",  payload: Razorpay failed-event response }
 *   { type: "checkout.dismissed" }
 *   { type: "checkout.error",   payload: { message } }
 */
export const CHECKOUT_PAGE = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Secure Checkout</title>
    <style>
      html,
      body {
        margin: 0;
        padding: 0;
        height: 100%;
        background: transparent;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      #loading {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        font-size: 13px;
        color: #64748b;
      }
      #boot-error {
        display: none;
        padding: 16px;
        font-size: 13px;
        line-height: 1.5;
        color: #b91c1c;
      }
    </style>
  </head>
  <body>
    <div id="loading">Loading secure payment&hellip;</div>
    <div id="boot-error">
      Razorpay checkout could not load. Check your connection and retry.
    </div>
    <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
    <script>
      (function () {
        function post(type, payload) {
          try {
            window.parent.postMessage(
              { type: type, payload: payload || {} },
              "*"
            );
          } catch (e) {
            // parent frame gone
          }
        }

        function readParams() {
          var p = new URLSearchParams(window.location.search);
          return {
            key: p.get("key"),
            order_id: p.get("order_id"),
            amount: p.get("amount"),
            currency: p.get("currency"),
            name: p.get("name"),
            description: p.get("description"),
            email: p.get("email"),
          };
        }

        function openCheckout() {
          var o = readParams();
          var loading = document.getElementById("loading");

          if (!o.key || !o.order_id) {
            if (loading) loading.style.display = "none";
            post("checkout.error", { message: "Invalid checkout parameters" });
            return;
          }

          if (typeof window.Razorpay === "undefined") {
            if (loading) loading.style.display = "none";
            document.getElementById("boot-error").style.display = "block";
            post("checkout.error", {
              message: "Razorpay checkout failed to load",
            });
            return;
          }

          if (loading) loading.style.display = "none";

          var rzp;
          try {
            rzp = new window.Razorpay({
              key: o.key,
              amount: o.amount,
              currency: o.currency || "INR",
              order_id: o.order_id,
              name: o.name || "Job Saver Pro",
              description: o.description || "",
              prefill: {
                email: o.email || "",
                name: o.name || "",
              },
              theme: { color: "#2563eb" },
              handler: function (response) {
                post("checkout.success", response);
              },
              modal: {
                ondismiss: function () {
                  post("checkout.dismissed");
                },
              },
            });
          } catch (e) {
            post("checkout.error", {
              message: (e && e.message) || "Checkout error",
            });
            return;
          }

          rzp.on("payment.failed", function (response) {
            post("checkout.failed", response);
          });

          rzp.open();
        }

        if (
          document.readyState === "complete" ||
          document.readyState === "interactive"
        ) {
          openCheckout();
        } else {
          window.addEventListener("load", openCheckout);
        }
      })();
    </script>
  </body>
</html>
`;
