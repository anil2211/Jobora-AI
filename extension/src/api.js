import { API_URL } from "./config";

export async function saveJob(data) {
  try {
    const auth = await chrome.storage.local.get(["token", "googleToken"]);

    if (!auth.token) {
      throw new Error("You must be logged in to save jobs");
    }

    const response = await fetch(
      `${API_URL}/api/jobs/extract`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${auth.token}`,
        },
        body: JSON.stringify({
          ...data,
          googleToken: auth.googleToken, // Required for Sheets sync
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to save job");
    }

    return response.json();
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
}

async function authRequest(path, options = {}) {
  const auth = await chrome.storage.local.get(["token"]);

  if (!auth.token) {
    throw new Error("You must be logged in");
  }

  const response = await fetch(`${API_URL}${path}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${auth.token}`,
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }

  return data;
}

export function createPaymentOrder(planId) {
  return authRequest("/api/payments/order", { method: "POST", body: { planId } });
}

export function verifyPayment(payload) {
  return authRequest("/api/payments/verify", { method: "POST", body: payload });
}

export function reportPaymentFailed(payload) {
  return authRequest("/api/payments/failed", { method: "POST", body: payload });
}

export function getPayments() {
  return authRequest("/api/payments");
}
