import React, { useState, useEffect } from "react";
import { saveJob } from "./api";
import Auth from "./auth";
import PaymentsPanel from "./components/Payments/PaymentsPanel";
import { UIProvider, useUI } from "./context/UIContext";
import Button from "./components/ui/Button";
import Card from "./components/ui/Card";
import Toast from "./components/ui/Toast";
import Skeleton from "./components/ui/Skeleton";
import Badge from "./components/ui/Badge";

function AppContent() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const { toasts, addToast, removeToast } = useUI();

  useEffect(() => {
    chrome.storage.local.get(["user"], (res) => {
      if (res.user) setUser(res.user);
    });
  }, []);

  async function extractJob() {
    setLoading(true);
    setResult(null);

    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const tab = tabs[0];

      chrome.tabs.sendMessage(
        tab.id,
        { action: "extract" },
        async (data) => {
          if (chrome.runtime.lastError) {
            addToast("Could not reach this page. Refresh the job page and try again.", "error");
            setLoading(false);
            return;
          }

          if (!data) {
            addToast("No job data found on this page", "warning");
            setLoading(false);
            return;
          }

          try {
            const response = await saveJob(data);
            setResult(response.job);
            addToast("Job saved successfully! 🎉", "success");
          } catch (apiError) {
            addToast(apiError.message, "error");
          } finally {
            setLoading(false);
          }
        }
      );
    } catch (error) {
      addToast(error?.message || "Unexpected error occurred", "error");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Sticky Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-xs">AI</span>
          </div>
          <h1 className="font-bold text-slate-800 tracking-tight">Job Saver</h1>
        </div>
        <Auth onUserChange={setUser} />
      </header>

      {/* Main Scrollable Content */}
      <main className="flex-1 overflow-y-auto p-4 space-y-6">
        {!loading && !result && (
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.586 5.586a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="space-y-1">
              <p className="text-slate-600 font-medium">No job detected</p>
              <p className="text-slate-400 text-xs px-6">Open a job listing page and click the button below to extract details.</p>
            </div>
          </div>
        )}

        {loading && (
          <div className="space-y-4 animate-in fade-in duration-500">
            <div className="flex items-center gap-3 mb-4">
              <Skeleton className="h-6 w-48" />
            </div>
            <Card className="space-y-4">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-20" />
              </div>
              <Skeleton className="h-24 w-full" />
            </Card>
          </div>
        )}

        {result && (
          <div className="animate-in slide-in-from-bottom-4 duration-300">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-1">Extracted Details</h3>
            <Card>
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-800 leading-tight">{result.title}</h2>
                  <p className="text-blue-600 font-medium text-sm">{result.company}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block">Location</span>
                    <span className="text-slate-700 font-medium">{result.location || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Salary</span>
                    <span className="text-slate-700 font-medium">{result.salary || 'Not disclosed'}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {result.skills && result.skills.length > 0 ? (
                    result.skills.map(skill => (
                      <Badge key={skill} variant="primary">{skill}</Badge>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400">No skills listed</span>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <span className="text-slate-400 text-xs block mb-1">Summary</span>
                  <p className="text-slate-600 text-xs leading-relaxed line-clamp-4">
                    {result.description || 'No description available.'}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}

        <PaymentsPanel user={user} />
      </main>

      {/* Sticky Footer */}
      <footer className="sticky bottom-0 p-4 bg-white border-t border-slate-200 shadow-lg">
        <div className="flex flex-col gap-2">
          <Button
            onClick={extractJob}
            isLoading={loading}
            disabled={!user}
            className="w-full py-3 text-base"
          >
            {result ? "Save Again" : "Save Current Job"}
          </Button>
          {!user && (
            <p className="text-center text-[10px] text-slate-400 font-medium">
              Please log in to save jobs to your sheet
            </p>
          )}
        </div>
      </footer>

      {/* Toasts */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <UIProvider>
      <AppContent />
    </UIProvider>
  );
}
