import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";

dotenv.config();

const express = (await import("express")).default;
const cors = (await import("cors")).default;
const jobRoutes = (await import("./routes/jobs.js")).default;

const app = express();

app.use(cors());

app.use(express.json());

app.use("/api/jobs", jobRoutes);

app.use("/api/auth",authRoutes);

app.get("/", (req, res) => {
  res.send("Job Saver API Running");
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});

