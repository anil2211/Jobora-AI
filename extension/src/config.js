const DEV_API_URL = "http://localhost:5000";
const PROD_API_URL = "https://jobora-ai.onrender.com";

const rawUrl =
  import.meta.env.VITE_API_URL || (import.meta.env.DEV ? DEV_API_URL : PROD_API_URL);

export const API_URL = rawUrl.replace(/\/+$/, "");
