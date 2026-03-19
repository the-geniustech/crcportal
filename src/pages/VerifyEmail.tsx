import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { verifyEmailToken } from "@/lib/auth";

const VerifyEmail: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    const token = searchParams.get("token");

    if (!token) {
      setStatus("error");
      setMessage("Invalid or missing verification token.");
      return;
    }

    setStatus("loading");
    verifyEmailToken(token)
      .then((result) => {
        if (!isActive) return;
        if (result.ok) {
          setStatus("success");
          setMessage(
            result.message ||
              "Email verified successfully. You can now sign in.",
          );
        } else {
          setStatus("error");
          setMessage(
            result.error?.message ||
              "Verification failed. Please request a new confirmation email.",
          );
        }
      })
      .catch(() => {
        if (!isActive) return;
        setStatus("error");
        setMessage(
          "Verification failed. Please request a new confirmation email.",
        );
      });

    return () => {
      isActive = false;
    };
  }, [searchParams]);

  return (
    <div className="flex justify-center items-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4 min-h-screen">
      <div className="bg-white shadow-xl p-8 rounded-3xl w-full max-w-md text-center">
        {/* Logo */}
        <div className="flex justify-center items-center gap-2 mb-6">
          <div className="flex justify-center items-center bg-emerald-500 rounded-full w-10 h-10">
            <svg
              className="w-6 h-6 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          </div>
          <span className="font-bold text-gray-900 text-xl">CRC Connect</span>
        </div>

        {status === "loading" && (
          <>
            <div className="flex justify-center items-center bg-emerald-100 mx-auto mb-6 rounded-full w-16 h-16">
              <svg
                className="w-8 h-8 text-emerald-600 animate-spin"
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
            <h2 className="mb-2 font-semibold text-gray-900 text-xl">
              Verifying Email
            </h2>
            <p className="text-gray-600">
              Please wait while we confirm your email address.
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="flex justify-center items-center bg-emerald-100 mx-auto mb-6 rounded-full w-16 h-16">
              <svg
                className="w-8 h-8 text-emerald-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="mb-4 font-bold text-gray-900 text-2xl">
              Email Confirmed!
            </h2>
            <p className="mb-6 text-gray-600">
              {message ||
                "Your email has been verified. You can now sign in to your account."}
            </p>
            <button
              onClick={() => navigate("/")}
              className="bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30 shadow-lg py-4 rounded-xl w-full font-semibold text-white transition-all duration-300"
            >
              Go to Sign In
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <div className="flex justify-center items-center bg-red-100 mx-auto mb-6 rounded-full w-16 h-16">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h2 className="mb-4 font-bold text-gray-900 text-2xl">
              Verification Failed
            </h2>
            <p className="mb-6 text-gray-600">
              {message ||
                "This verification link is invalid or expired. Please request a new confirmation email."}
            </p>
            <button
              onClick={() => navigate("/")}
              className="bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30 shadow-lg py-4 rounded-xl w-full font-semibold text-white transition-all duration-300"
            >
              Back to Home
            </button>
            <p className="mt-6 text-gray-500 text-sm">
              Need help?{" "}
              <a
                href="mailto:support@crcconnect.ng"
                className="text-emerald-600 hover:underline"
              >
                Contact Support
              </a>
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
