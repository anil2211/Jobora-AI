import React, { useState } from "react";

export default function Auth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  // Load user from storage on mount
  React.useEffect(() => {
    chrome.storage.local.get(["user"], (result) => {
      if (result.user) {
        setUser(result.user);
      }
    });
  }, []);

  async function handleLogin() {
    setLoading(true);
    try {
      // Get access token from Chrome identity
      chrome.identity.getAuthToken({ interactive: true }, async (token) => {
        if (chrome.runtime.lastError || !token) {
          console.error("Identity error:", chrome.runtime.lastError);
          setLoading(false);
          return;
        }

        try {
          const response = await fetch("http://localhost:5000/api/auth/google", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          });

          const data = await response.json();

          if (!response.ok) throw new Error(data.error || "Auth failed");

          chrome.storage.local.set({
            token: data.token, // JWT
            googleToken: token, // Access Token
            user: data.user,
          }, () => {
            setUser(data.user);
            setLoading(false);
          });

          console.log("Login successful:", data.user);
        } catch (err) {
          console.error("Backend auth error:", err);
          setLoading(false);
        }
      });
    } catch (error) {
      console.error("Login failed:", error);
      setLoading(false);
    }
  }

  async function handleLogout() {
    chrome.storage.local.remove(["token", "googleToken", "user"], () => {
      setUser(null);
    });
  }

  if (user) {
    return (
      <div style={{ textAlign: 'center', marginBottom: '10px', fontSize: '12px' }}>
        <span>Welcome, <b>{user.name}</b>! </span>
        <button onClick={handleLogout} style={{ marginLeft: '5px', cursor: 'pointer' }}>Logout</button>
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center', marginBottom: '10px' }}>
      <button
        onClick={handleLogin}
        disabled={loading}
        style={{ padding: '8px 16px', cursor: 'pointer' }}
      >
        {loading ? "Connecting..." : "Login with Google"}
      </button>
    </div>
  );
}
