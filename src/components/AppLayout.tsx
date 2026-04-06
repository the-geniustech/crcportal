import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Header from "./crc/Header";
import MarqueeBanner from "./crc/MarqueeBanner";
import HeroSection from "./crc/HeroSection";
import StatsSection from "./crc/StatsSection";
import WhyChooseSection from "./crc/WhyChooseSection";
import HowItWorksSection from "./crc/HowItWorksSection";
import ImpactSection from "./crc/ImpactSection";
import TestimonialsSection from "./crc/TestimonialsSection";
import FAQSection from "./crc/FAQSection";
import ContactSection from "./crc/ContactSection";
import CTASection from "./crc/CTASection";
import Footer from "./crc/Footer";
import AuthModal from "./crc/AuthModal";
import { goToContactSupport } from "@/lib/support";

const AppLayout: React.FC = () => {
  const { user, loading } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<
    "login" | "signup" | "forgot-password"
  >("login");

  const handleLoginClick = () => {
    setAuthMode("login");
    setAuthModalOpen(true);
  };

  const handleGetStartedClick = () => {
    setAuthMode("signup");
    setAuthModalOpen(true);
  };

  const handleAuthSuccess = () => {
    // Optionally scroll to a section or show welcome message
  };

  return (
    <div className="bg-white min-h-screen">
      {/* Header */}
      <Header
        onLoginClick={handleLoginClick}
        onGetStartedClick={handleGetStartedClick}
      />

      {/* Marquee Banner - Below Header */}
      <div className="pt-16 md:pt-20">
        <MarqueeBanner
          text="Season's Greetings, Champions! Welcome to Our New Year of Glorious Possibilities"
          speed={50}
          backgroundColor="linear-gradient(90deg, #065f46 0%, #047857 25%, #059669 50%, #047857 75%, #065f46 100%)"
          textColor="#ffffff"
          fontSize="1rem"
          fontWeight="500"
          pauseOnHover={true}
        />
      </div>

      {/* Main Content */}
      <main>
        {/* Hero Section */}
        <HeroSection
          onGetStartedClick={handleGetStartedClick}
          onLoginClick={handleLoginClick}
        />

        {/* Stats Section */}
        <StatsSection />

        {/* Why Choose CRC */}
        <WhyChooseSection />

        {/* How It Works */}
        <HowItWorksSection onGetStartedClick={handleGetStartedClick} />

        {/* Impact Section */}
        <ImpactSection />

        {/* Testimonials */}
        <TestimonialsSection />

        {/* FAQ */}
        <FAQSection />

        {/* Contact */}
        <ContactSection />

        {/* CTA Section - Only show if not logged in */}
        {!loading && !user && (
          <CTASection onGetStartedClick={handleGetStartedClick} />
        )}

        {/* Welcome Section for logged in users */}
        {!loading && user && (
          <section className="bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 py-20">
            <div className="mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl text-center">
              <div className="flex justify-center items-center bg-white/20 mx-auto mb-6 rounded-full w-20 h-20">
                <svg
                  className="w-10 h-10 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="mb-4 font-bold text-white text-3xl md:text-4xl">
                Welcome to CRC Connect!
              </h2>
              <p className="mb-8 text-emerald-100 text-lg">
                You're now part of our growing community. Start exploring your
                savings options and connect with other members.
              </p>
              <div className="flex sm:flex-row flex-col justify-center items-center gap-4">
                <a
                  href="/dashboard"
                  className="inline-block bg-white hover:bg-gray-100 shadow-xl px-8 py-4 rounded-xl w-full sm:w-auto font-semibold text-emerald-600 text-center transition-all duration-300"
                >
                  View Dashboard
                </a>
                <button
                  onClick={goToContactSupport}
                  className="hover:bg-white px-8 py-4 border-2 border-white rounded-xl w-full sm:w-auto font-semibold text-white hover:text-emerald-600 transition-all duration-300"
                >
                  Contact Support
                </button>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <Footer />

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
        onAuthSuccess={handleAuthSuccess}
      />
    </div>
  );
};

export default AppLayout;
