import "./config.js";

import authRoutes from "./routes/auth.js";

const express = (await import("express")).default;
const cors = (await import("cors")).default;
const jobRoutes = (await import("./routes/jobs.js")).default;
const paymentRoutes = (await import("./routes/payments.js")).default;

import { logger, sendToBetterStack } from "./utils/logger.js";


const app = express();


const allowedOrigins = [
  "https://jobora-ai.onrender.com",
];


app.use(cors({
  origin: function (origin, callback) {

    if (!origin) return callback(null, true);

    if (
      allowedOrigins.indexOf(origin) !== -1 ||
      origin.startsWith("chrome-extension://")
    ) {
      callback(null, true);
    } 
    else {
      callback(new Error("Not allowed by CORS"));
    }

  },
  credentials: true,
}));


app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf.toString("utf8");
  },
}));


// API Routes
app.use("/api/jobs", jobRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/payments", paymentRoutes);



app.get("/", (req,res)=>{

  logger.info("Health check API called");

  res.send("Job Saver API is Running");

});



// Global Error Handler
app.use(async(err, req, res, next)=>{

  const statusCode = err.status || 500;


  logger.error({
    error: err.message,
    stack: err.stack,
    url:req.originalUrl,
    method:req.method
  });


  await sendToBetterStack(
    "error",
    "GLOBAL_SERVER_ERROR",
    {
      error:err.message,
      path:req.originalUrl,
      method:req.method,
      statusCode
    }
  );


  res.status(statusCode).json({

    success:false,

    error:
    statusCode === 500
    ? "Internal Server Error"
    : err.message

  });


});



const PORT = process.env.PORT || 5000;


app.listen(PORT,()=>{


  logger.info(
    `Job Saver API started on port ${PORT}`
  );


  sendToBetterStack(
    "info",
    "SERVER_STARTED",
    {
      port:PORT,
      environment:process.env.NODE_ENV
    }
  );

  sendToBetterStack(
    "info",
    "HEALTH_CHECK",
    {
        route: "/"
    }
);


});