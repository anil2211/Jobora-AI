import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export async function verifyGoogleToken(token) {
  try {
    // Attempt to verify as an ID Token (used by web-based GSI)
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    return ticket.getPayload();
  } catch (err) {
    // If ID token verification fails, try verifying as an Access Token (used by chrome.identity).
    // Use the userinfo endpoint (NOT tokeninfo) because tokeninfo does not return
    // name/picture even when the profile scope is granted.
    try {
      const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await response.json();

      if (!response.ok || payload.error || !payload.sub) {
        throw new Error(payload.error_description || payload.error || "Invalid access token");
      }

      // Normalize the payload to match the ID token structure (sub, email, name, picture)
      return {
        sub: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
      };
    } catch (accessErr) {
      console.error("Google token verification failed:", accessErr.message);
      throw new Error("Authentication failed: Invalid Google token");
    }
  }
}

export function createJWT(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
}
