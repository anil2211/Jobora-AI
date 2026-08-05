export async function saveJob(data) {
  try {
    const auth = await chrome.storage.local.get(["token", "googleToken"]);

    if (!auth.token) {
      throw new Error("You must be logged in to save jobs");
    }

    const response = await fetch(
      "http://localhost:5000/api/jobs/extract",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${auth.token}`,
        },
        body: JSON.stringify({
          ...data,
          googleToken: auth.googleToken, // Required for Sheets sync
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to save job");
    }

    return response.json();
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
}
