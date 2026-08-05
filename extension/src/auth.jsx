import React, { useState, useEffect } from "react";
import Button from "./components/ui/Button";

export default function Auth({ onUserChange }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    chrome.storage.local.get(["user"], (result) => {
      if (result.user) {
        setUser(result.user);
        if (onUserChange) onUserChange(result.user);
      }
    });
  }, [onUserChange]);

  async function handleLogin() {
    setLoading(true);
    try {
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
            token: data.token,
            googleToken: token,
            user: data.user,
          }, () => {
            setUser(data.user);
            if (onUserChange) onUserChange(data.user);
            setLoading(false);
          });
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
      if (onUserChange) onUserChange(null);
    });
  }

  if (user) {
    return (
      <div className="flex items-center gap-2 pl-2">
        <img
          src={user.avatar}
          className="w-6 h-6 rounded-full border border-slate-200"
          alt={user.name}
          onError={(e) => { e.target.src = 'https://cdn-icons-png.flaticon.com/512/149/149071.png'; }}
        />
        <Button
          onClick={handleLogout}
          variant="ghost"
          className="text-[10px] h-6 px-2"
        >
          Logout
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={handleLogin}
      isLoading={loading}
      variant="secondary"
      className="text-xs h-7 px-3"
    >
      Login
    </Button>
  );
}
