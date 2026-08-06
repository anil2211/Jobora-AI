import React, { useState, useEffect } from "react";
import Button from "./components/ui/Button";
import { API_URL } from "./config";

export default function Auth({ onUserChange }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    chrome.storage.local.get(["user"], (result) => {
      if (result.user) {
        setAvatarError(false);
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
          const response = await fetch(`${API_URL}/api/auth/google`, {
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
            setAvatarError(false);
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
    const displayName = user.name || (user.email ? user.email.split("@")[0] : "User");
    const initials = displayName
      .split(" ")
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();

    const showAvatar = user.avatar && !avatarError;

    return (
      <div className="flex items-center gap-2 pl-2">
        {showAvatar ? (
          <img
            src={user.avatar}
            referrerPolicy="no-referrer"
            className="w-6 h-6 rounded-full border border-slate-200 object-cover"
            alt={displayName}
            onError={() => setAvatarError(true)}
          />
        ) : (
          <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-semibold">
            {initials}
          </div>
        )}
        <span
          className="text-xs font-medium text-slate-700 max-w-[80px] truncate"
          title={displayName}
        >
          {displayName}
        </span>
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
