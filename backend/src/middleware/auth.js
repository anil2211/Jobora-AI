import jwt from "jsonwebtoken";

export function authenticate(req, res, next) {

  const header = req.headers.authorization;

  if (!header) {
    return res.status(401).json({
      error: "No token",
    });
  }

  const token = header.split(" ")[1];

  try {
    req.user = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    next();

  } catch (error) {

    console.error(`[${new Date().toISOString()}] JWT Verification failed: ${error.message}`);

    res.status(401).json({
      error: "Invalid token",
    });
  }
}