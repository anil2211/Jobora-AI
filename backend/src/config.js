import dotenv from "dotenv";

dotenv.config();

const REQUIRED_ENV_VARS = [
  "SUPABASE_URL",
  "SUPABASE_KEY",
  "GROQ_API_KEY",
  "JWT_SECRET",
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
];

function validateEnv() {
  const missing = REQUIRED_ENV_VARS.filter((varName) => !process.env[varName]);

  if (missing.length > 0) {
    console.error("❌ Missing required environment variables:");
    missing.forEach((varName) => console.error(`   - ${varName}`));
    process.exit(1);
  }

  console.log("✅ Environment variables validated successfully.");
}

validateEnv();

export default process.env;
