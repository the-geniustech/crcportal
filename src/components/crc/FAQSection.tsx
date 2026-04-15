import React, { useState } from "react";

const faqs = [
  {
    question: "What is CRC Connect?",
    answer:
      "CRC Connect is a Contributions savings and loan platform designed for Nigerian communities. We combine traditional Contributions values with modern technology to help members save, borrow, and grow their wealth together.",
  },
  {
    question: "How do I become a member?",
    answer:
      'Becoming a member is easy! Simply click "Get Started" and complete the registration process. You\'ll need to provide basic identification documents (NIN, BVN, or valid ID), and your account will be verified within 24-48 hours.',
  },
  {
    question: "What are the savings options available?",
    answer:
      "We offer flexible savings options including individual savings accounts with competitive interest rates, group savings (Ajo/Esusu style), target savings for specific goals, and fixed deposit options for higher returns.",
  },
  {
    question: "How quickly can I get a loan?",
    answer:
      "Loan approval is typically completed within 24-48 hours. Once approved, funds are disbursed to your account immediately. Our 98% approval rate means most members who meet the basic criteria get approved.",
  },
  {
    question: "What are the loan requirements?",
    answer:
      "To qualify for a loan, you need to be an active member with at least 3 months of consistent savings. The loan amount depends on your savings history and can be up to 3x your total savings balance.",
  },
  {
    question: "Is my money safe with CRC Connect?",
    answer:
      "Absolutely! We use bank-grade security measures including 256-bit encryption, two-factor authentication, and regular security audits. Your funds are also insured and we maintain strict compliance with CBN regulations.",
  },
  {
    question: "What are the interest rates?",
    answer:
      "Savings accounts earn up to 10% annual interest. Loan interest rates start from 2% monthly, which is significantly lower than traditional money lenders. Exact rates depend on the loan type and duration.",
  },
  {
    question: "Can I withdraw my savings anytime?",
    answer:
      "Yes, you can withdraw from your regular savings account anytime. However, fixed deposits and target savings may have withdrawal restrictions. Group savings follow the agreed-upon schedule of your savings group.",
  },
];

const FAQSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="bg-gray-50 py-20 md:py-28">
      <div className="mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
        {/* Section Header */}
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <span className="inline-block bg-emerald-100 mb-4 px-4 py-1.5 rounded-full font-semibold text-emerald-700 text-sm">
            Got Questions?
          </span>
          <h2 className="mb-6 font-bold text-gray-900 text-3xl md:text-4xl lg:text-5xl">
            Frequently Asked Questions
          </h2>
          <p className="text-gray-600 text-lg">
            Find answers to common questions about CRC Connect and how we can
            help you achieve your financial goals.
          </p>
        </div>

        {/* FAQ Accordion */}
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="bg-white shadow-md border border-gray-100 rounded-2xl overflow-hidden"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="flex justify-between items-center hover:bg-gray-50 px-6 py-5 w-full text-left transition-colors"
              >
                <span className="pr-4 font-semibold text-gray-900">
                  {faq.question}
                </span>
                <span
                  className={`flex-shrink-0 w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center transition-transform duration-300 ${openIndex === index ? "rotate-180 bg-emerald-500" : ""}`}
                >
                  <svg
                    className={`w-5 h-5 ${openIndex === index ? "text-white" : "text-emerald-600"}`}
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
                </span>
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  openIndex === index ? "max-h-96" : "max-h-0"
                }`}
              >
                <div className="px-6 pb-5 text-gray-600 leading-relaxed">
                  {faq.answer}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Still Have Questions */}
        <div className="mt-12 text-center">
          <p className="mb-4 text-gray-600">Still have questions?</p>
          <button
            onClick={() => {
              const contactSection = document.getElementById("contact");
              if (contactSection)
                contactSection.scrollIntoView({ behavior: "smooth" });
            }}
            className="inline-flex items-center gap-2 font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
          >
            Contact our support team
            <svg
              className="w-5 h-5"
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
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
