let checkoutPromise = null;

/**
 * Load the Razorpay checkout script into the side panel page.
 * Returns a Promise that resolves with the global `Razorpay` constructor.
 */
export function loadRazorpayCheckout() {
  if (window.Razorpay) return Promise.resolve(window.Razorpay);

  if (checkoutPromise) return checkoutPromise;

  checkoutPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;

    script.onload = () => {
      if (window.Razorpay) {
        resolve(window.Razorpay);
      } else {
        checkoutPromise = null;
        reject(new Error("Razorpay checkout loaded but Razorpay is not available"));
      }
    };

    script.onerror = () => {
      checkoutPromise = null;
      reject(new Error("Failed to load Razorpay checkout. Check your connection and retry."));
    };

    document.head.appendChild(script);
  });

  return checkoutPromise;
}
