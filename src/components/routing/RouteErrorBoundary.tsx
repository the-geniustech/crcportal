import { useEffect } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Home,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import {
  isRouteErrorResponse,
  useNavigate,
  useRouteError,
} from "react-router-dom";
import { Button } from "@/components/ui/button";

function getErrorDetails(error: unknown) {
  if (isRouteErrorResponse(error)) {
    return {
      title:
        error.status === 404
          ? "We couldn't find that page"
          : error.status === 403
            ? "You don't have access to this page"
            : "Something interrupted this page",
      description:
        typeof error.data === "string" && error.data.trim()
          ? error.data
          : error.statusText || "An unexpected routing error occurred.",
      statusLabel: `${error.status} ${error.statusText || ""}`.trim(),
    };
  }

  if (error instanceof Error) {
    return {
      title: "Something went wrong on this page",
      description:
        error.message || "An unexpected application error occurred.",
      statusLabel: "Application Error",
    };
  }

  return {
    title: "Something went wrong on this page",
    description:
      "An unexpected application error occurred. Please try again.",
    statusLabel: "Application Error",
  };
}

export default function RouteErrorBoundary() {
  const navigate = useNavigate();
  const error = useRouteError();
  const details = getErrorDetails(error);
  const is404 = isRouteErrorResponse(error) && error.status === 404;

  useEffect(() => {
    console.error("Route error boundary caught an error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.16),_transparent_32%),linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] px-4 py-10 sm:px-6">
      <div className="mx-auto flex min-h-[80vh] max-w-5xl items-center justify-center">
        <div className="grid w-full gap-6 overflow-hidden rounded-[28px] border border-white/70 bg-white/90 shadow-[0_30px_80px_rgba(15,23,42,0.14)] backdrop-blur sm:grid-cols-[1.1fr_0.9fr]">
          <div className="p-8 sm:p-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-emerald-700">
              <ShieldAlert className="h-3.5 w-3.5" />
              Safe Recovery
            </div>

            <div className="mt-6 max-w-2xl">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                {details.title}
              </h1>
              <p className="mt-3 text-base leading-7 text-slate-600 sm:text-lg">
                {details.description}
              </p>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => window.location.reload()}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Reload Page
              </Button>
              <Button variant="outline" onClick={() => navigate(-1)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go Back
              </Button>
              <Button variant="outline" onClick={() => navigate("/dashboard")}>
                <Home className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
            </div>

            <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-900">
                    {details.statusLabel}
                  </p>
                  <p className="text-sm text-slate-600">
                    {is404
                      ? "The link may be outdated, or the page may have moved."
                      : "We caught the error and kept the rest of the app safe. You can retry now or head back to a stable page."}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 bg-slate-950 p-8 text-white sm:border-l sm:border-t-0 sm:p-10">
            <div className="max-w-md">
              <p className="text-sm uppercase tracking-[0.22em] text-emerald-300">
                What You Can Do
              </p>
              <div className="mt-5 space-y-5">
                <div>
                  <p className="text-lg font-semibold">Try a clean reload</p>
                  <p className="mt-1 text-sm leading-6 text-slate-300">
                    If this was a temporary state mismatch, reloading usually
                    restores the page cleanly.
                  </p>
                </div>
                <div>
                  <p className="text-lg font-semibold">Go back one step</p>
                  <p className="mt-1 text-sm leading-6 text-slate-300">
                    Return to the previous screen without losing the rest of your
                    session context.
                  </p>
                </div>
                <div>
                  <p className="text-lg font-semibold">Return to the dashboard</p>
                  <p className="mt-1 text-sm leading-6 text-slate-300">
                    Jump back to a safe landing page and continue from there.
                  </p>
                </div>
              </div>

              <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-medium text-white">
                  Developer note
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  This boundary now replaces the default raw React Router crash
                  screen with a branded recovery experience.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
