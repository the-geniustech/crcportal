import React, { useState } from 'react';

const faqs = [
  {
    question: 'What is CRC Connect?',
    answer: 'CRC Connect is a cooperative savings and loan platform designed for Nigerian communities. We combine traditional cooperative values with modern technology to help members save, borrow, and grow their wealth together.',
  },
  {
    question: 'How do I become a member?',
    answer: 'Becoming a member is easy! Simply click "Get Started" and complete the registration process. You\'ll need to provide basic identification documents (NIN, BVN, or valid ID), and your account will be verified within 24-48 hours.',
  },
  {
    question: 'What are the savings options available?',
    answer: 'We offer flexible savings options including individual savings accounts with competitive interest rates, group savings (Ajo/Esusu style), target savings for specific goals, and fixed deposit options for higher returns.',
  },
  {
    question: 'How quickly can I get a loan?',
    answer: 'Loan approval is typically completed within 24-48 hours. Once approved, funds are disbursed to your account immediately. Our 98% approval rate means most members who meet the basic criteria get approved.',
  },
  {
    question: 'What are the loan requirements?',
    answer: 'To qualify for a loan, you need to be an active member with at least 3 months of consistent savings. The loan amount depends on your savings history and can be up to 3x your total savings balance.',
  },
  {
    question: 'Is my money safe with CRC Connect?',
    answer: 'Absolutely! We use bank-grade security measures including 256-bit encryption, two-factor authentication, and regular security audits. Your funds are also insured and we maintain strict compliance with CBN regulations.',
  },
  {
    question: 'What are the interest rates?',
    answer: 'Savings accounts earn up to 10% annual interest. Loan interest rates start from 2% monthly, which is significantly lower than traditional money lenders. Exact rates depend on the loan type and duration.',
  },
  {
    question: 'Can I withdraw my savings anytime?',
    answer: 'Yes, you can withdraw from your regular savings account anytime. However, fixed deposits and target savings may have withdrawal restrictions. Group savings follow the agreed-upon schedule of your savings group.',
  },
];

const FAQSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-20 md:py-28 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block px-4 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-sm font-semibold mb-4">
            Got Questions?
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-gray-600">
            Find answers to common questions about CRC Connect and how we can help you achieve your financial goals.
          </p>
        </div>

        {/* FAQ Accordion */}
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div 
              key={index}
              className="bg-white rounded-2xl shadow-md overflow-hidden border border-gray-100"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
              >
                <span className="font-semibold text-gray-900 pr-4">{faq.question}</span>
                <span className={`flex-shrink-0 w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center transition-transform duration-300 ${openIndex === index ? 'rotate-180 bg-emerald-500' : ''}`}>
                  <svg 
                    className={`w-5 h-5 ${openIndex === index ? 'text-white' : 'text-emerald-600'}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </button>
              <div 
                className={`overflow-hidden transition-all duration-300 ${
                  openIndex === index ? 'max-h-96' : 'max-h-0'
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
          <p className="text-gray-600 mb-4">Still have questions?</p>
          <button 
            onClick={() => {
              const contactSection = document.getElementById('contact');
              if (contactSection) contactSection.scrollIntoView({ behavior: 'smooth' });
            }}
            className="inline-flex items-center gap-2 text-emerald-600 font-semibold hover:text-emerald-700 transition-colors"
          >
            Contact our support team
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
