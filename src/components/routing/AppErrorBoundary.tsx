import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, Home, RefreshCw, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
  errorMessage: string | null;
};

export default class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  constructor(props: AppErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: null,
    };
  }

  static getDerivedStateFromError(error: unknown): AppErrorBoundaryState {
    return {
      hasError: true,
      errorMessage:
        error instanceof Error && error.message
          ? error.message
          : "A critical application error occurred.",
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("App-level error boundary caught an error:", error, errorInfo);
  }

  handleTryAgain = () => {
    this.setState({
      hasError: false,
      errorMessage: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.assign("/");
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.14),_transparent_35%),linear-gradient(180deg,#f8fafc_0%,#e2e8f0_100%)] px-4 py-10 sm:px-6">
        <div className="mx-auto flex min-h-[80vh] max-w-4xl items-center justify-center">
          <div className="w-full overflow-hidden rounded-[28px] border border-white/70 bg-white/95 shadow-[0_28px_80px_rgba(15,23,42,0.14)] backdrop-blur">
            <div className="grid gap-0 md:grid-cols-[1.15fr_0.85fr]">
              <div className="p-8 sm:p-10">
                <div className="inline-flex items-center gap-2 rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-red-700">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  App Recovery
                </div>

                <h1 className="mt-6 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                  The app hit an unexpected problem
                </h1>
                <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                  We caught the failure before it could leave you on a broken
                  screen. You can retry the app, reload fully, or head back to a
                  safe starting point.
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={this.handleTryAgain}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Try Again
                  </Button>
                  <Button variant="outline" onClick={this.handleReload}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reload App
                  </Button>
                  <Button variant="outline" onClick={this.handleGoHome}>
                    <Home className="mr-2 h-4 w-4" />
                    Go Home
                  </Button>
                </div>

                <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">
                    Error summary
                  </p>
                  <p className="mt-2 break-words text-sm leading-6 text-slate-600">
                    {this.state.errorMessage ||
                      "A critical application error occurred."}
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-100 bg-slate-950 p-8 text-white md:border-l md:border-t-0 sm:p-10">
                <p className="text-sm uppercase tracking-[0.22em] text-emerald-300">
                  Coverage
                </p>
                <div className="mt-5 space-y-5">
                  <div>
                    <p className="text-lg font-semibold">
                      Outside-router protection
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-300">
                      This boundary catches failures in the top-level app shell,
                      providers, and any rendering path not handled by the route
                      boundary.
                    </p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold">Safe fallback</p>
                    <p className="mt-1 text-sm leading-6 text-slate-300">
                      Instead of a blank page or crash dump, users get a stable
                      recovery screen with clear next actions.
                    </p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold">Layered resilience</p>
                    <p className="mt-1 text-sm leading-6 text-slate-300">
                      The app-level boundary now complements the route-level
                      boundary, so we have coverage both inside and outside the
                      router tree.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
