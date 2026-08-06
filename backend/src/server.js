import "./config.js"; // Validate environment variables
import authRoutes from "./routes/auth.js";

const express = (await import("express")).default;
const cors = (await import("cors")).default;
const jobRoutes = (await import("./routes/jobs.js")).default;

const app = express();

// Restrict CORS to production domain and Chrome extensions
const allowedOrigins = [
  "https://jobora-ai.onrender.com",
];

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || origin.startsWith("chrome-extension://")) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));

app.use(express.json());

app.use("/api/jobs", jobRoutes);
app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
  res.send("Job Saver API is  Running");
});

// Global Error Handler
app.use((err, req, res, next) => {
  const statusCode = err.status || 500;
  console.error(`[${new Date().toISOString()}] ERROR: ${err.message}`);
  if (statusCode === 500) {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    success: false,
    error: statusCode === 500 ? "Internal Server Error" : err.message,
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
