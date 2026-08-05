import express from "express";
import { supabase } from "../supabase.js";
import { createJWT, verifyGoogleToken } from "../auth.js";

const router = express.Router();

router.post("/google", async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Token is required" });
    }

    const googleUser = await verifyGoogleToken(token);

    // Find or create user in Supabase
    let { data: user, error: selectError } = await supabase
      .from("users")
      .select("*")
      .eq("google_id", googleUser.sub)
      .single();

    if (selectError && selectError.code !== "PGRST116") { // PGRST116 is "no rows found"
      throw selectError;
    }

    if (!user) {
      const { data: newUser, error: insertError } = await supabase
        .from("users")
        .insert({
          google_id: googleUser.sub,
          email: googleUser.email,
          name: googleUser.name,
          avatar: googleUser.picture,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      user = newUser;
    } else {
      const { data: updatedUser, error: updateError } = await supabase
        .from("users")
        .update({ name: googleUser.name, avatar: googleUser.picture })
        .eq("id", user.id)
        .select()
        .single();

      if (updateError) throw updateError;
      user = updatedUser;
    }

    const jwtToken = createJWT(user);

    res.json({
      token: jwtToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    console.error("Auth Error:", error);
    res.status(401).json({
      error: error.message || "Authentication failed",
    });
  }
});

export default router;
