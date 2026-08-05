import { google } from "googleapis";

export async function createSheetsClient(accessToken) {
  if (!accessToken) {
    throw new Error("Access token is required.");
  }

  const auth = new google.auth.OAuth2();

  auth.setCredentials({
    access_token: accessToken,
  });

  return google.sheets({
    version: "v4",
    auth,
  });
}

export async function createJobSheet(accessToken) {
  try {
    const sheets = await createSheetsClient(accessToken);

    // Create a new spreadsheet
    const response = await sheets.spreadsheets.create({
      resource: {
        properties: {
          title: "My Job Tracker",
        },
      },
    });

    const spreadsheetId = response.data.spreadsheetId;

    if (!spreadsheetId) {
      throw new Error("Failed to create spreadsheet.");
    }

    // Add header row
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "Sheet1!A1:I1",
      valueInputOption: "RAW",
      resource: {
        values: [
          [
            "Title",
            "Company",
            "Location",
            "Salary",
            "Skills",
            "Experience",
            "URL",
            "Source",
            "Date",
          ],
        ],
      },
    });

    console.log("Spreadsheet created successfully:", spreadsheetId);

    return spreadsheetId;
  } catch (error) {
    console.error(
      "Google Sheets Error:",
      error.response?.data || error.message || error
    );

    throw error;
  }
}

export async function addJobToSheet(
  accessToken,
  spreadsheetId,
  job
) {
  try {
    if (!accessToken) {
      throw new Error("Access token is required.");
    }

    if (!spreadsheetId) {
      throw new Error("Spreadsheet ID is required.");
    }

    const sheets = await createSheetsClient(accessToken);

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "Sheet1!A:I",
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      resource: {
        values: [
          [
            job.title || "",
            job.company || "",
            job.location || "",
            job.salary || "",
            Array.isArray(job.skills)
              ? job.skills.join(", ")
              : job.skills || "",
            job.experience || "",
            job.url || "",
            job.source || "",
            new Date().toISOString(),
          ],
        ],
      },
    });

    console.log("Job added to Google Sheet successfully.");
  } catch (error) {
    console.error(
      "Failed to add job to Google Sheet:",
      error.response?.data || error.message || error
    );

    throw error;
  }
}