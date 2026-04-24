import React, { useState } from "react";
const testimonials = [
  {
    name: "Tunde Ramoni Oladipo ",
    role: "Business Owner, Abeokuta",
    image: "/testimonials/adaeze-okonkwo.jpeg",
    quote:
      "CRC is a partner in progress by many standards! Consistently reliable and always supportive.",
    rating: 5,
  },
  {
    name: "Chukwuemeka Eze",
    role: "Teacher, Enugu",
    image:
      "https://d64gsuwffb70l.cloudfront.net/694d1e2d65df4113e9e6f7e1_1766661852456_d93e3554.png",
    quote:
      "As a teacher, saving was always difficult. The group savings feature made it easier and more accountable. I've saved more in one year than I did in five years before.",
    rating: 5,
  },
  {
    name: "Funke Adeleke",
    role: "Market Trader, Ibadan",
    image:
      "https://d64gsuwffb70l.cloudfront.net/694d1e2d65df4113e9e6f7e1_1766661818462_8832d6a2.jpg",
    quote:
      "The loan approval process is so fast! I got approved in less than 24 hours when I needed emergency funds for my daughter's school fees. Thank you CRC!",
    rating: 5,
  },
  {
    name: "Tayo Michael",
    role: "Ibadan & UK",
    image: "/testimonials/tayo-michael.jpeg",
    quote:
      "CRC Connect has transformed how our farming Contributions operates. We pool resources together and everyone benefits. It's truly community banking at its best.",
    rating: 5,
  },
  {
    name: "Ngozi Nnamdi",
    role: "Nurse, Port Harcourt",
    image:
      "https://d64gsuwffb70l.cloudfront.net/694d1e2d65df4113e9e6f7e1_1766661819737_4599c6e6.jpg",
    quote:
      "I love the transparency. I can see exactly where my money is and track every transaction. The mobile access means I can manage my savings even during night shifts.",
    rating: 5,
  },
  {
    name: "Oluwaseun Bakare",
    role: "Software Developer, Abuja",
    image:
      "https://d64gsuwffb70l.cloudfront.net/694d1e2d65df4113e9e6f7e1_1766661861875_8ec29158.png",
    quote:
      "Finally, a platform that understands Nigerian Contributions culture and brings it online. The technology is solid and the customer service is excellent.",
    rating: 5,
  },
];
const TestimonialsSection: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const nextTestimonial = () => {
    setActiveIndex((prev) => (prev + 1) % testimonials.length);
  };
  const prevTestimonial = () => {
    setActiveIndex(
      (prev) => (prev - 1 + testimonials.length) % testimonials.length,
    );
  };
  return (
    <section
      id="testimonials"
      className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 py-20 md:py-28"
    >
      <div className="mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        {/* Section Header */}
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <span className="inline-block bg-emerald-500/20 mb-4 px-4 py-1.5 rounded-full font-semibold text-emerald-300 text-sm">
            Success Stories
          </span>
          <h2 className="mb-6 font-bold text-white text-3xl md:text-4xl lg:text-5xl">
            What Our Members Say
          </h2>
          <p className="text-emerald-100 text-lg">
            Real stories from real people who have transformed their financial
            lives with CRC Connect.
          </p>
        </div>

        {/* Featured Testimonial */}
        <div className="mx-auto mb-12 max-w-4xl">
          <div
            className="bg-white/10 backdrop-blur-lg p-8 md:p-12 border border-white/20 rounded-3xl text-left"
            data-mixed-content="true"
          >
            <div className="flex md:flex-row flex-col items-center gap-8">
              <div className="flex-shrink-0">
                <img
                  src={testimonials[activeIndex].image}
                  alt={testimonials[activeIndex].name}
                  className="shadow-xl border-4 border-emerald-400 rounded-full w-24 md:w-32 h-24 md:h-32 object-cover"
                />
              </div>
              <div className="md:text-left text-center">
                <div className="flex justify-center md:justify-start items-center gap-1 mb-4">
                  {[...Array(testimonials[activeIndex].rating)].map((_, i) => (
                    <svg
                      key={i}
                      className="w-5 h-5 text-yellow-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <blockquote
                  className="mb-6 text-white text-lg md:text-xl leading-relaxed"
                  data-mixed-content="true"
                >
                  {testimonials[activeIndex].quote}
                </blockquote>
                <div>
                  <p className="font-bold text-white text-xl">
                    {testimonials[activeIndex].name}
                  </p>
                  <p className="text-emerald-300">
                    {testimonials[activeIndex].role}
                  </p>
                </div>
              </div>
            </div>
            {/* Navigation */}
            <div className="flex justify-center items-center gap-4 mt-8">
              <button
                onClick={prevTestimonial}
                className="bg-white/10 hover:bg-white/20 p-3 rounded-full transition-colors"
              >
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <div className="flex gap-2">
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveIndex(index)}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${index === activeIndex ? "bg-emerald-400 w-8" : "bg-white/30 hover:bg-white/50"}`}
                  />
                ))}
              </div>
              <button
                onClick={nextTestimonial}
                className="bg-white/10 hover:bg-white/20 p-3 rounded-full transition-colors"
              >
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Testimonial Grid */}
        <div className="gap-6 grid md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className={`bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:bg-white/10 transition-all cursor-pointer ${index === activeIndex ? "ring-2 ring-emerald-400" : ""}`}
              onClick={() => setActiveIndex(index)}
            >
              <div className="flex items-center gap-4 mb-4">
                <img
                  src={testimonial.image}
                  alt={testimonial.name}
                  className="border-2 border-emerald-400/50 rounded-full w-12 h-12 object-cover"
                />
                <div>
                  <p className="font-semibold text-white">{testimonial.name}</p>
                  <p className="text-emerald-300 text-sm">{testimonial.role}</p>
                </div>
              </div>
              <p
                className="text-gray-300 text-sm line-clamp-3"
                data-mixed-content="true"
              >
                "{testimonial.quote}"
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
export default TestimonialsSection;
