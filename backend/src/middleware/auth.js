import jwt from "jsonwebtoken";

export function authenticate(req, res, next) {

  console.log("Authorization header:", req.headers.authorization);

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

    console.log("Authenticated user:", req.user);

    next();

  } catch (error) {

    console.log("JWT error:", error.message);

    res.status(401).json({
      error: "Invalid token",
    });
  }
}