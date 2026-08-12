import express from "express";

const router = express.Router();

/*
 * Dograh call webhook
 * Receives call information after the Dograh call ends.
 */
router.post("/webhook", async (req, res) => {
  try {
    console.log("========== DOGRAH WEBHOOK ==========");
    console.log(JSON.stringify(req.body, null, 2));

    const {
      call_id,
      first_name,
      last_name,
      company_name,
      phone_number,
      duration,
      call_disposition,
      requirement,
      demo_requested,
      preferred_demo_time,
      callback_requested,
      preferred_callback_time,
      recording_url,
      transcript_url
    } = req.body;

    // TODO:
    // Save these values to your database here.

    console.log("Call ID:", call_id);
    console.log("Phone:", phone_number);
    console.log("Name:", first_name, last_name);
    console.log("Requirement:", requirement);
    console.log("Disposition:", call_disposition);
    console.log("Recording:", recording_url);
    console.log("Transcript:", transcript_url);

    return res.status(200).json({
      success: true,
      message: "Dograh webhook received",
      call_id: call_id || null
    });

  } catch (error) {
    console.error("Dograh webhook error:", error);

    return res.status(500).json({
      success: false,
      error: "Failed to process Dograh webhook"
    });
  }
});

export default router;