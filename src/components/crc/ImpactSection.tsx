import React from "react";

const ImpactSection: React.FC = () => {
  return (
    <section className="bg-white py-20 md:py-28">
      <div className="mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        {/* Section Header */}
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <span className="inline-block bg-emerald-100 mb-4 px-4 py-1.5 rounded-full font-semibold text-emerald-700 text-sm">
            Our Impact
          </span>
          <h2 className="mb-6 font-bold text-gray-900 text-3xl md:text-4xl lg:text-5xl">
            Transforming Lives Across Nigeria
          </h2>
          <p className="text-gray-600 text-lg">
            See how CRC Connect is making a difference in communities across the
            nation.
          </p>
        </div>

        <div className="items-center gap-12 grid lg:grid-cols-2">
          {/* Left - Stats Cards */}
          <div className="gap-6 grid grid-cols-2">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-500 p-6 rounded-2xl text-white">
              <div className="flex justify-center items-center bg-white/20 mb-4 rounded-xl w-12 h-12">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <p className="mb-1 font-bold text-3xl">5,000+</p>
              <p className="text-emerald-100">Active Members</p>
            </div>

            <div className="bg-gradient-to-br from-blue-500 to-indigo-500 p-6 rounded-2xl text-white">
              <div className="flex justify-center items-center bg-white/20 mb-4 rounded-xl w-12 h-12">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <p className="mb-1 font-bold text-3xl">₦50M+</p>
              <p className="text-blue-100">Total Savings</p>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-6 rounded-2xl text-white">
              <div className="flex justify-center items-center bg-white/20 mb-4 rounded-xl w-12 h-12">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <p className="mb-1 font-bold text-3xl">₦30M+</p>
              <p className="text-purple-100">Loans Disbursed</p>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-red-500 p-6 rounded-2xl text-white">
              <div className="flex justify-center items-center bg-white/20 mb-4 rounded-xl w-12 h-12">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
              <p className="mb-1 font-bold text-3xl">150+</p>
              <p className="text-orange-100">Active Groups</p>
            </div>
          </div>

          {/* Right - Content */}
          <div>
            <h3 className="mb-6 font-bold text-gray-900 text-2xl md:text-3xl">
              Building Financial Freedom, One Community at a Time
            </h3>
            <p className="mb-6 text-gray-600 leading-relaxed">
              Since our launch, CRC Connect has been at the forefront of
              financial inclusion in Nigeria. We've helped thousands of
              individuals and families achieve their financial goals through our
              Contributions savings and loan platform.
            </p>
            <p className="mb-8 text-gray-600 leading-relaxed">
              Our members have used their savings and loans to start businesses,
              pay for education, build homes, and secure their families'
              futures. We're proud to be part of their success stories.
            </p>

            {/* Progress Bars */}
            <div className="space-y-6">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="font-medium text-gray-700 text-sm">
                    Loan Approval Rate
                  </span>
                  <span className="font-semibold text-emerald-600 text-sm">
                    98%
                  </span>
                </div>
                <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full h-full"
                    style={{ width: "98%" }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="font-medium text-gray-700 text-sm">
                    Member Satisfaction
                  </span>
                  <span className="font-semibold text-emerald-600 text-sm">
                    96%
                  </span>
                </div>
                <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full h-full"
                    style={{ width: "96%" }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="font-medium text-gray-700 text-sm">
                    On-time Repayment
                  </span>
                  <span className="font-semibold text-emerald-600 text-sm">
                    94%
                  </span>
                </div>
                <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-full h-full"
                    style={{ width: "94%" }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Locations */}
        <div className="mt-20">
          <h3 className="mb-8 font-bold text-gray-900 text-xl text-center">
            Active Across Nigeria
          </h3>
          <div className="flex flex-wrap justify-center gap-4">
            {[
              "Lagos",
              "Abuja",
              "Port Harcourt",
              "Kano",
              "Ibadan",
              "Enugu",
              "Kaduna",
              "Benin City",
              "Owerri",
              "Calabar",
              "Jos",
              "Warri",
            ].map((city, index) => (
              <span
                key={index}
                className="bg-gray-100 hover:bg-emerald-100 px-4 py-2 rounded-full font-medium text-gray-700 hover:text-emerald-700 text-sm transition-colors cursor-default"
              >
                {city}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ImpactSection;
