import ExcelJS from "exceljs";
import express from "express";
import { addJobToSheet, createJobSheet } from "../googleSheets.js";
import { authenticate } from "../middleware/auth.js";
import { extractJob } from "../openai.js";
import { supabase } from "../supabase.js";

const router = express.Router();

// Extract job information using AI and save it
router.post("/extract", authenticate, async (req, res) => {
  const { text, url, googleToken } = req.body;

  if (!googleToken) {
    const err = new Error("Google access token is required for Sheets sync");
    err.status = 400;
    throw err;
  }

  const job = await extractJob(text);

  job.url = url;
  job.user_id = req.user.id; // Set user_id from JWT
  job.source = new URL(url).hostname;

  // 1. Save job to Supabase
  const { data, error } = await supabase
    .from("jobs")
    .insert(job)
    .select();

  if (error) throw error;

  const savedJob = data[0];

  // 2. Handle Google Sheets Sync
  try {
    // Get user's spreadsheet ID
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("spreadsheet_id")
      .eq("id", req.user.id)
      .single();

    if (userError) throw userError;

    let spreadsheetId = userData?.spreadsheet_id;

    // Create a new Google Sheet if one doesn't exist for this user
    if (!spreadsheetId) {
      spreadsheetId = await createJobSheet(googleToken);

      await supabase
        .from("users")
        .update({ spreadsheet_id: spreadsheetId })
        .eq("id", req.user.id);
    }

    // Add the saved job to the Google Sheet
    await addJobToSheet(googleToken, spreadsheetId, savedJob);

  } catch (sheetError) {
    console.error("Google Sheets Sync Error:", sheetError);
    // We don't fail the whole request if only the sheet sync fails,
    // because the job is already saved in Supabase.
  }

  res.json({
    success: true,
    job: savedJob,
  });
});

// Save a job directly
router.post("/", async (req, res) => {
  const { data, error } = await supabase
    .from("jobs")
    .insert(req.body)
    .select();

  if (error) throw error;

  res.json(data[0]);
});

// Get all saved jobs (protected)
router.get("/", authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("user_id", req.user.id) // Only return jobs for the logged-in user
    .order("created_at", { ascending: false });

  if (error) throw error;

  res.json(data);
});

// Export jobs to Excel (protected)
router.get("/export", authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("user_id", req.user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Job Tracker");

  sheet.columns = [
    { header: "Title", key: "title", width: 30 },
    { header: "Company", key: "company", width: 25 },
    { header: "Location", key: "location", width: 25 },
    { header: "Salary", key: "salary", width: 15 },
    { header: "Experience", key: "experience", width: 20 },
    { header: "Employment Type", key: "employmentType", width: 20 },
    { header: "Skills", key: "skills", width: 50 },
    { header: "Description", key: "description", width: 60 },
    { header: "Source", key: "source", width: 25 },
    { header: "Job URL", key: "url", width: 50 },
    { header: "Saved Date", key: "created_at", width: 25 },
  ];

  data.forEach(job => {
    sheet.addRow({
      title: job.title,
      company: job.company,
      location: job.location,
      salary: job.salary,
      experience: job.experience,
      employmentType: job.employmentType,
      skills: Array.isArray(job.skills) ? job.skills.join(", ") : job.skills,
      description: job.description,
      source: job.source,
      url: job.url,
      created_at: job.created_at,
    });
  });

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", "attachment; filename=Job_Tracker.xlsx");

  await workbook.xlsx.write(res);
  res.end();
});

export default router;
