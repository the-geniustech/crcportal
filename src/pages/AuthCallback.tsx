import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { getSession } from "@/lib/auth";

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [status, setStatus] = useState<
    "loading" | "success" | "error" | "info"
  >("loading");
  const [message, setMessage] = useState<string>("Finishing up...");

  const errorParam = useMemo(() => searchParams.get("error"), [searchParams]);
  const errorDescription = useMemo(
    () => searchParams.get("error_description"),
    [searchParams],
  );

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        // If some old provider callback hits this route, show a safe message.
        if (errorParam || errorDescription) {
          if (cancelled) return;
          setStatus("error");
          setMessage(
            errorDescription ||
              errorParam ||
              "Authentication failed. Please try again.",
          );
          setTimeout(() => navigate("/", { replace: true }), 2500);
          return;
        }

        // Standalone backend does not use OAuth callbacks here.
        // If the user already has tokens, take them to the dashboard.
        const { session } = await getSession();

        if (cancelled) return;

        if (session?.accessToken) {
          setStatus("success");
          setMessage("You are signed in. Redirecting to your dashboard...");
          setTimeout(() => navigate("/dashboard", { replace: true }), 1200);
          return;
        }

        setStatus("info");
        setMessage(
          "This app now uses a standalone authentication system. Please sign in to continue.",
        );
        setTimeout(() => navigate("/", { replace: true }), 2000);
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setMessage(
          err instanceof Error
            ? err.message
            : "Unable to complete authentication. Please sign in again.",
        );
        setTimeout(() => navigate("/", { replace: true }), 2500);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [navigate, errorParam, errorDescription]);

  return (
    <div className="flex justify-center items-center bg-gradient-to-br from-emerald-50 to-teal-50 p-4 min-h-screen">
      <div className="bg-white shadow-xl p-8 rounded-3xl w-full max-w-md text-center">
        {/* Logo */}
        <div className="flex justify-center items-center gap-2 mb-6">
          <div className="flex justify-center items-center bg-emerald-500 rounded-full w-12 h-12">
            <svg
              className="w-7 h-7 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          </div>
          <span className="font-bold text-gray-900 text-2xl">CRC Connect</span>
        </div>

        {status === "loading" && (
          <div className="mx-auto mb-6 w-16 h-16">
            <svg
              className="w-full h-full text-emerald-500 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
        )}

        <h2
          className={`mb-2 font-bold text-2xl ${
            status === "error"
              ? "text-red-600"
              : status === "success"
                ? "text-emerald-600"
                : "text-gray-900"
          }`}
        >
          {status === "loading"
            ? "Please wait"
            : status === "success"
              ? "Success"
              : status === "error"
                ? "Authentication Error"
                : "Sign in required"}
        </h2>

        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  );
};

export default AuthCallback;
