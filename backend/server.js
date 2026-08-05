import "dotenv/config";

import cors from "cors";
import express from "express";

import jobRoutes from "./routes/jobs.js";

console.log("SUPABASE URL:", process.env.SUPABASE_URL);

const app = express();

app.use(cors());

app.use(express.json());

app.use("/api/jobs", jobRoutes);

app.get("/", (req, res) => {
  res.send("Job Saver API Running");
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});