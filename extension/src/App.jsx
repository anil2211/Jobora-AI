import { useState } from "react";
import { saveJob } from "./api";
import Auth from "./auth";

function App() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function extractJob() {
    setLoading(true);

    try {
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      chrome.tabs.sendMessage(
        tabs[0].id,
        {
          action: "extract",
        },
        async (data) => {
          if (chrome.runtime.lastError) {
            console.error(
              chrome.runtime.lastError.message
            );
            setLoading(false);
            return;
          }

          if (!data) {
            console.error("No data received");
            setLoading(false);
            return;
          }

          try {
            const response = await saveJob(data);
            setResult(response.job);
          } catch (apiError) {
            alert(apiError.message);
            console.error("API Error:", apiError);
          } finally {
            setLoading(false);
          }
        }
      );
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  }

  return (
  <div className="app-container" style={{ padding: '10px', width: '300px' }}>

    <h2 style={{ textAlign: 'center' }}>AI Job Saver</h2>

    <Auth />

    <button
      onClick={extractJob}
      disabled={loading}
      style={{ width: '100%', padding: '10px', cursor: 'pointer' }}
    >
      {loading ? "Saving..." : "Save Current Job"}
    </button>

    {result && (
      <div className="result-box" style={{ marginTop: '10px' }}>
        <h3 style={{ textAlign: 'center', fontSize: '14px' }}>Extracted Job:</h3>
        <pre style={{ fontSize: '10px', whiteSpace: 'pre-wrap', backgroundColor: '#f4f4f4', padding: '5px' }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      </div>
    )}

  </div>
  );
}

export default App;
