import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface HeaderProps {
  onLoginClick: () => void;
  onGetStartedClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onLoginClick, onGetStartedClick }) => {
  const { user, profile, signOut, loading } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
    setMobileMenuOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    setUserMenuOpen(false);
    setMobileMenuOpen(false);
  };

  const getUserInitials = () => {
    if (profile?.full_name) {
      return profile.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  const getMembershipBadge = () => {
    if (!profile?.membership_status) return null;
    const statusColors: Record<string, string> = {
      active: "bg-emerald-100 text-emerald-700",
      pending: "bg-yellow-100 text-yellow-700",
      suspended: "bg-red-100 text-red-700",
      inactive: "bg-gray-100 text-gray-700",
    };
    return (
      <span
        className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[profile.membership_status]}`}
      >
        {profile.membership_status.charAt(0).toUpperCase() +
          profile.membership_status.slice(1)}
      </span>
    );
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? "bg-white shadow-lg" : "bg-white/95 backdrop-blur-sm shadow-sm"}`}
    >
      <div className="mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="flex justify-between items-center h-16 md:h-20">
          {/* Logo */}
          <div className="flex items-center gap-1">
            <div className="flex justify-center items-center bg-emerald-500 rounded-full w-8 h-8">
              <svg
                className="w-5 h-5 text-white"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            </div>
            <span className="font-bold text-gray-900 text-lg">CRC Connect</span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <button
              onClick={() => scrollToSection("why-choose")}
              className="font-medium text-gray-900 hover:text-emerald-500 transition-colors"
            >
              Why CRC
            </button>
            <button
              onClick={() => scrollToSection("how-it-works")}
              className="font-medium text-gray-900 hover:text-emerald-500 transition-colors"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection("testimonials")}
              className="font-medium text-gray-900 hover:text-emerald-500 transition-colors"
            >
              Testimonials
            </button>
            <button
              onClick={() => scrollToSection("faq")}
              className="font-medium text-gray-900 hover:text-emerald-500 transition-colors"
            >
              FAQ
            </button>
            <button
              onClick={() => scrollToSection("contact")}
              className="font-medium text-gray-900 hover:text-emerald-500 transition-colors"
            >
              Contact
            </button>
          </nav>

          {/* CTA Buttons / User Menu */}
          <div className="hidden md:flex items-center gap-4">
            {loading ? (
              <div className="bg-gray-200 rounded-full w-8 h-8 animate-pulse" />
            ) : user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-3 hover:bg-gray-100 p-1.5 rounded-full transition-colors"
                >
                  <div className="flex justify-center items-center bg-emerald-500 rounded-full w-10 h-10 font-semibold text-white">
                    {getUserInitials()}
                  </div>
                  <svg
                    className={`w-4 h-4 transition-transform text-gray-700 ${userMenuOpen ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {/* User Dropdown */}
                {userMenuOpen && (
                  <div className="right-0 z-50 absolute bg-white shadow-xl mt-2 py-2 border border-gray-100 rounded-xl w-64">
                    <div className="px-4 py-3 border-gray-100 border-b">
                      <p className="font-semibold text-gray-900">
                        {profile?.full_name || "Member"}
                      </p>
                      <p className="text-gray-500 text-sm truncate">
                        {user.email}
                      </p>
                      <div className="mt-2">{getMembershipBadge()}</div>
                    </div>

                    <div className="py-2">
                      <a
                        href="/profile"
                        className="flex items-center gap-3 hover:bg-gray-50 px-4 py-2 w-full text-gray-700 text-left"
                      >
                        <svg
                          className="w-5 h-5 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                        My Profile
                      </a>
                      <a
                        href="/dashboard"
                        className="flex items-center gap-3 hover:bg-gray-50 px-4 py-2 w-full text-gray-700 text-left"
                      >
                        <svg
                          className="w-5 h-5 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
                          />
                        </svg>
                        Dashboard
                      </a>
                      {/* <a
                        href="/groups"
                        className="flex items-center gap-3 hover:bg-gray-50 px-4 py-2 w-full text-gray-700 text-left"
                      >
                        <svg
                          className="w-5 h-5 text-gray-400"
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
                        My Groups
                      </a> */}
                      <a
                        href="/payments"
                        className="flex items-center gap-3 hover:bg-gray-50 px-4 py-2 w-full text-gray-700 text-left"
                      >
                        <svg
                          className="w-5 h-5 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                          />
                        </svg>
                        Payments
                      </a>

                      {user.role === "groupCoordinator" ||
                      user.role === "group_coordinator" ||
                      user.role === "admin" ? (
                        <a
                          href="/admin"
                          className="flex items-center gap-3 hover:bg-gray-50 px-4 py-2 w-full text-gray-700 text-left"
                        >
                          <svg
                            className="w-5 h-5 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                            />
                          </svg>
                          Admin Panel
                        </a>
                      ) : null}
                      <a
                        href="/settings"
                        className="flex items-center gap-3 hover:bg-gray-50 px-4 py-2 w-full text-gray-700 text-left"
                      >
                        <svg
                          className="w-5 h-5 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        Settings
                      </a>
                    </div>

                    <div className="pt-2 border-gray-100 border-t">
                      <button
                        onClick={handleSignOut}
                        className="flex items-center gap-3 hover:bg-red-50 px-4 py-2 w-full text-red-600 text-left"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                          />
                        </svg>
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <button
                  onClick={onLoginClick}
                  className="px-4 py-2 rounded-lg font-medium text-gray-900 hover:text-emerald-600 transition-colors"
                >
                  Login
                </button>
                <button
                  onClick={onGetStartedClick}
                  className="bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30 shadow-lg px-5 py-2.5 rounded-lg font-semibold text-white transition-colors"
                >
                  Sign Up
                </button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2"
          >
            <svg
              className="w-6 h-6 text-gray-900"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {mobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden right-4 left-4 absolute bg-white shadow-xl mt-2 p-4 rounded-lg">
            <nav className="flex flex-col gap-4">
              <button
                onClick={() => scrollToSection("why-choose")}
                className="font-medium text-gray-900 hover:text-emerald-500 text-left"
              >
                Why CRC
              </button>
              <button
                onClick={() => scrollToSection("how-it-works")}
                className="font-medium text-gray-900 hover:text-emerald-500 text-left"
              >
                How It Works
              </button>
              <button
                onClick={() => scrollToSection("testimonials")}
                className="font-medium text-gray-900 hover:text-emerald-500 text-left"
              >
                Testimonials
              </button>
              <button
                onClick={() => scrollToSection("faq")}
                className="font-medium text-gray-900 hover:text-emerald-500 text-left"
              >
                FAQ
              </button>
              <button
                onClick={() => scrollToSection("contact")}
                className="font-medium text-gray-900 hover:text-emerald-500 text-left"
              >
                Contact
              </button>
              <hr className="border-gray-200" />
              {user ? (
                <>
                  <div className="flex items-center gap-3 py-2">
                    <div className="flex justify-center items-center bg-emerald-500 rounded-full w-10 h-10 font-semibold text-white">
                      {getUserInitials()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {profile?.full_name || "Member"}
                      </p>
                      <p className="text-gray-500 text-sm">{user.email}</p>
                    </div>
                  </div>
                  <a
                    href="/dashboard"
                    className="bg-emerald-500 py-2.5 rounded-lg w-full font-semibold text-white text-center"
                  >
                    Go to Dashboard
                  </a>
                  <button
                    onClick={handleSignOut}
                    className="hover:bg-red-50 py-2.5 border border-red-200 rounded-lg w-full font-semibold text-red-600"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={onLoginClick}
                    className="font-medium text-emerald-600 text-left"
                  >
                    Login
                  </button>
                  <button
                    onClick={onGetStartedClick}
                    className="bg-emerald-500 py-2.5 rounded-lg w-full font-semibold text-white"
                  >
                    Sign Up
                  </button>
                </>
              )}
            </nav>
          </div>
        )}
      </div>

      {/* Click outside to close user menu */}
      {userMenuOpen && (
        <div
          className="z-40 fixed inset-0"
          onClick={() => setUserMenuOpen(false)}
        />
      )}
    </header>
  );
};

export default Header;
