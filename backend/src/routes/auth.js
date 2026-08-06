import express from "express";
import { supabase } from "../supabase.js";
import { createJWT, verifyGoogleToken } from "../auth.js";

const router = express.Router();

router.post("/google", async (req, res) => {
  const { token } = req.body;

  if (!token) {
    const err = new Error("Token is required");
    err.status = 400;
    throw err;
  }

  let googleUser;
  try {
    googleUser = await verifyGoogleToken(token);
  } catch (err) {
    err.status = 401;
    throw err;
  }

  if (!googleUser?.sub) {
    const err = new Error("Invalid Google token");
    err.status = 401;
    throw err;
  }

  // Find existing user. Avoid .single() so real PostgREST errors (missing
  // table/column, RLS, wrong SUPABASE_KEY) surface instead of the generic
  // "Cannot coerce the result to a single JSON object" message.
  const { data: existing, error: selectError } = await supabase
    .from("users")
    .select("*")
    .eq("google_id", googleUser.sub)
    .limit(1);

  if (selectError) throw selectError;

  let user = existing?.[0] ?? null;

  if (!user) {
    const { data: created, error: insertError } = await supabase
      .from("users")
      .insert({
        google_id: googleUser.sub,
        email: googleUser.email,
        name: googleUser.name,
        avatar: googleUser.picture,
      })
      .select();

    if (insertError) throw insertError;
    user = created[0];
  } else {
    const { data: updated, error: updateError } = await supabase
      .from("users")
      .update({ name: googleUser.name, avatar: googleUser.picture })
      .eq("id", user.id)
      .select();

    if (updateError) throw updateError;
    user = updated[0];
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
});

export default router;
