const rawUrl = import.meta.env.VITE_API_URL;

if (!rawUrl) {
  throw new Error("VITE_API_URL environment variable is not defined. Please check your .env file.");
}

export const API_URL = rawUrl.replace(/\/+$/, "");
