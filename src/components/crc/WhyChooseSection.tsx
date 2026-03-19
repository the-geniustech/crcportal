import React from 'react';

const features = [
  {
    title: 'Secure & Transparent',
    description: 'Your funds are protected with bank-grade security. Track every transaction in real-time with complete transparency.',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    color: 'emerald',
  },
  {
    title: 'Easy Loan Access',
    description: 'Get quick access to loans with competitive rates. Our 98% approval rate means you can count on us when you need funds.',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    color: 'blue',
  },
  {
    title: 'Community Building',
    description: 'Join savings groups with like-minded individuals. Build wealth together while strengthening community bonds.',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    color: 'purple',
  },
  {
    title: 'Financial Growth',
    description: 'Watch your savings grow with attractive interest rates. Our members have collectively saved over ₦50 million.',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
    color: 'orange',
  },
  {
    title: 'Mobile Friendly',
    description: 'Access your account anytime, anywhere. Our platform works seamlessly on all devices for your convenience.',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
    color: 'pink',
  },
  {
    title: '24/7 Support',
    description: 'Our dedicated support team is always available to help you with any questions or concerns you may have.',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    color: 'teal',
  },
];

const colorClasses: Record<string, { bg: string; text: string; hover: string }> = {
  emerald: { bg: 'bg-emerald-100', text: 'text-emerald-600', hover: 'group-hover:bg-emerald-500' },
  blue: { bg: 'bg-blue-100', text: 'text-blue-600', hover: 'group-hover:bg-blue-500' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-600', hover: 'group-hover:bg-purple-500' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-600', hover: 'group-hover:bg-orange-500' },
  pink: { bg: 'bg-pink-100', text: 'text-pink-600', hover: 'group-hover:bg-pink-500' },
  teal: { bg: 'bg-teal-100', text: 'text-teal-600', hover: 'group-hover:bg-teal-500' },
};

const WhyChooseSection: React.FC = () => {
  return (
    <section id="why-choose" className="py-20 md:py-28 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block px-4 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-sm font-semibold mb-4">
            Why Choose Us
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            Why Choose CRC?
          </h2>
          <p className="text-lg text-gray-600">
            A trusted platform built for your financial growth and security. We combine traditional cooperative values with modern technology.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const colors = colorClasses[feature.color];
            return (
              <div 
                key={index}
                className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-emerald-200 hover:-translate-y-1"
              >
                <div className={`inline-flex items-center justify-center w-14 h-14 ${colors.bg} ${colors.text} rounded-xl mb-6 ${colors.hover} group-hover:text-white transition-all duration-300`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default WhyChooseSection;
