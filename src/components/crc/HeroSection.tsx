import React, { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMyLoanApplicationsQuery } from "@/hooks/loans/useMyLoanApplicationsQuery";
import { useDashboardSummaryQuery } from "@/hooks/dashboard/useDashboardSummaryQuery";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface HeroSectionProps {
  onGetStartedClick: () => void;
  onLoginClick: () => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({
  onGetStartedClick,
  onLoginClick,
}) => {
  const { user, profile, loading } = useAuth();
  const isAuthenticated = Boolean(user && !loading);
  const dashboardSummaryQuery = useDashboardSummaryQuery({
    enabled: isAuthenticated,
  });
  const myLoansQuery = useMyLoanApplicationsQuery({ enabled: isAuthenticated });

  const totalContributions = Number(
    dashboardSummaryQuery.data?.totalContributions ?? 0,
  );
  const formatCompactNaira = (amount: number) => {
    if (!Number.isFinite(amount)) return "₦0";
    const label = new Intl.NumberFormat("en-NG", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(amount);
    return `₦${label}`;
  };
  const activeLoans = (myLoansQuery.data ?? []).filter(
    (loan) => loan.status === "disbursed" || loan.status === "defaulted",
  ).length;
  const isStatsLoading =
    dashboardSummaryQuery.isLoading || myLoansQuery.isLoading;
  const hasStatsError = dashboardSummaryQuery.isError || myLoansQuery.isError;
  const showStatsPlaceholder = isStatsLoading || hasStatsError;
  const totalContributionsLabel = showStatsPlaceholder
    ? "\u2014"
    : formatCompactNaira(totalContributions);
  const totalContributionsFull = `₦${totalContributions.toLocaleString()}`;

  useEffect(() => {
    if (hasStatsError) {
      console.error("Failed to load hero stats", {
        dashboardSummaryError: dashboardSummaryQuery.error,
        loansError: myLoansQuery.error,
      });
    }
  }, [hasStatsError, dashboardSummaryQuery.error, myLoansQuery.error]);

  return (
    <section className="relative flex justify-center items-center min-h-[calc(100vh-8rem)] overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0">
        <img
          src="https://d64gsuwffb70l.cloudfront.net/694d1e2d65df4113e9e6f7e1_1766661928186_f7405a62.png"
          alt="Nigerian community members"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/90 via-emerald-800/80 to-teal-900/90" />
      </div>

      {/* Content */}
      <div className="z-10 relative mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32 max-w-7xl">
        <div className="mx-auto max-w-4xl text-center">
          {user && !loading ? (
            <>
              <div className="inline-flex items-center gap-2 bg-emerald-500/20 mb-6 px-4 py-2 rounded-full font-medium text-emerald-300 text-sm">
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                Welcome back, {profile?.full_name?.split(" ")[0] || "Member"}!
              </div>
              <h1 className="mb-6 font-bold text-white text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-tight">
                Your Financial <span className="text-emerald-400">Journey</span>{" "}
                Continues Here
              </h1>

              <p className="mx-auto mb-10 max-w-2xl text-gray-200 text-lg sm:text-xl leading-relaxed">
                Access your savings, manage your loans, and connect with your
                Contributions group. Your financial freedom awaits.
              </p>

              {/* CTA Buttons for logged in users */}
              <div className="flex sm:flex-row flex-col justify-center items-center gap-4">
                <a
                  href="/dashboard"
                  className="group flex justify-center items-center gap-2 bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30 shadow-xl px-8 py-4 rounded-xl w-full sm:w-auto font-semibold text-white transition-all duration-300"
                >
                  View Dashboard
                  <svg
                    className="w-5 h-5 transition-transform group-hover:translate-x-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 8l4 4m0 0l-4 4m4-4H3"
                    />
                  </svg>
                </a>
                <button
                  onClick={() => {
                    const element = document.getElementById("contact");
                    if (element) element.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="hover:bg-white px-8 py-4 border-2 border-white rounded-xl w-full sm:w-auto font-semibold text-white hover:text-emerald-800 transition-all duration-300"
                >
                  Get Support
                </button>
              </div>

              {/* Quick Stats for logged in users */}
              <div className="gap-4 grid grid-cols-3 mx-auto mt-12 max-w-lg">
                <div
                  className="bg-white/10 backdrop-blur-sm p-4 rounded-xl"
                  title={hasStatsError ? "Stats unavailable" : undefined}
                >
                  <p
                    className="font-bold text-white text-2xl"
                    title={
                      showStatsPlaceholder ? undefined : totalContributionsFull
                    }
                  >
                    {totalContributionsLabel}
                  </p>
                  <div className="flex justify-center items-center gap-1 text-emerald-200 text-sm">
                    <span>Total Contribution</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="p-0.5 rounded-full focus:outline-none focus:ring-2 focus:ring-white/60 text-emerald-200 hover:text-white transition"
                        >
                          <Info className="w-3.5 h-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        Includes all verified contribution deposits and group
                        contributions across your membership.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
                <div
                  className="bg-white/10 backdrop-blur-sm p-4 rounded-xl"
                  title={hasStatsError ? "Stats unavailable" : undefined}
                >
                  <p className="font-bold text-white text-2xl">
                    {showStatsPlaceholder
                      ? "\u2014"
                      : activeLoans.toLocaleString()}
                  </p>
                  <p className="text-emerald-200 text-sm">Active Loans</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl">
                  <p className="font-bold text-white text-2xl capitalize">
                    {profile?.membership_status || "Pending"}
                  </p>
                  <p className="text-emerald-200 text-sm">Status</p>
                </div>
              </div>
            </>
          ) : (
            <>
              <h1 className="mb-6 font-bold text-white text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-tight">
                Financial <span className="text-emerald-400">Empowerment</span>{" "}
                for Nigerian Communities
              </h1>

              <p className="mx-auto mb-10 max-w-2xl text-gray-200 text-lg sm:text-xl leading-relaxed">
                Join thousands of Nigerians building financial stability through
                our Contributions savings and loan platform.
              </p>

              {/* CTA Buttons */}
              <div className="flex sm:flex-row flex-col justify-center items-center gap-4">
                <button
                  onClick={onGetStartedClick}
                  className="group flex justify-center items-center gap-2 bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30 shadow-xl px-8 py-4 rounded-xl w-full sm:w-auto font-semibold text-white transition-all duration-300"
                >
                  Get Started Today
                  <svg
                    className="w-5 h-5 transition-transform group-hover:translate-x-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 8l4 4m0 0l-4 4m4-4H3"
                    />
                  </svg>
                </button>
                <button
                  onClick={onLoginClick}
                  className="hover:bg-white px-8 py-4 border-2 border-white rounded-xl w-full sm:w-auto font-semibold text-white hover:text-emerald-800 transition-all duration-300"
                >
                  Login
                </button>
              </div>

              {/* Trust Badges */}
              <div className="flex flex-wrap justify-center items-center gap-6 mt-12 text-gray-300 text-sm">
                <div className="flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-emerald-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>Secure & Trusted</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-emerald-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>CBN Compliant</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-emerald-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>24/7 Support</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="bottom-8 left-1/2 absolute -translate-x-1/2 animate-bounce transform">
        <svg
          className="w-6 h-6 text-white/60"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
      </div>
    </section>
  );
};

export default HeroSection;
