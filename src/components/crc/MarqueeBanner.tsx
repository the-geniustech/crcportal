import React, { useState, useEffect, useRef } from 'react';

interface MarqueeBannerProps {
  text?: string;
  speed?: number; // pixels per second
  backgroundColor?: string;
  textColor?: string;
  fontSize?: string;
  fontFamily?: string;
  fontWeight?: string;
  pauseOnHover?: boolean;
  className?: string;
}

const MarqueeBanner: React.FC<MarqueeBannerProps> = ({
  text = "Season's Greetings, Champions! Welcome to Our New Year of Glorious Possibilities",
  speed = 50,
  backgroundColor = 'linear-gradient(90deg, #065f46 0%, #047857 25%, #059669 50%, #047857 75%, #065f46 100%)',
  textColor = '#ffffff',
  fontSize = '1rem',
  fontFamily = 'inherit',
  fontWeight = '500',
  pauseOnHover = true,
  className = '',
}) => {
  const [isPaused, setIsPaused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [animationDuration, setAnimationDuration] = useState(20);

  useEffect(() => {
    // Calculate animation duration based on text length and speed
    const textLength = text.length;
    const baseDuration = Math.max(10, textLength * 0.3);
    const adjustedDuration = baseDuration * (50 / speed);
    setAnimationDuration(adjustedDuration);
  }, [text, speed]);

  const marqueeStyle: React.CSSProperties = {
    background: backgroundColor.includes('gradient') ? backgroundColor : backgroundColor,
    backgroundColor: !backgroundColor.includes('gradient') ? backgroundColor : undefined,
  };

  const textStyle: React.CSSProperties = {
    color: textColor,
    fontSize,
    fontFamily,
    fontWeight,
  };

  return (
    <div 
      ref={containerRef}
      className={`relative overflow-hidden py-3 ${className}`}
      style={marqueeStyle}
      onMouseEnter={() => pauseOnHover && setIsPaused(true)}
      onMouseLeave={() => pauseOnHover && setIsPaused(false)}
    >
      {/* Gradient overlays for smooth fade effect */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-16 z-10 pointer-events-none"
        style={{
          background: `linear-gradient(to right, ${backgroundColor.includes('gradient') ? '#065f46' : backgroundColor}, transparent)`,
        }}
      />
      <div 
        className="absolute right-0 top-0 bottom-0 w-16 z-10 pointer-events-none"
        style={{
          background: `linear-gradient(to left, ${backgroundColor.includes('gradient') ? '#065f46' : backgroundColor}, transparent)`,
        }}
      />

      {/* Marquee content */}
      <div 
        className="flex whitespace-nowrap"
        style={{
          animation: `marquee ${animationDuration}s linear infinite`,
          animationPlayState: isPaused ? 'paused' : 'running',
        }}
      >
        {/* Repeat text multiple times for seamless loop */}
        {[...Array(4)].map((_, index) => (
          <div key={index} className="flex items-center mx-8">
            {/* Decorative star icon */}
            <svg 
              className="w-4 h-4 mr-3 flex-shrink-0" 
              style={{ color: textColor }}
              fill="currentColor" 
              viewBox="0 0 24 24"
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <span style={textStyle} className="tracking-wide">
              {text}
            </span>
            {/* Decorative sparkle icon */}
            <svg 
              className="w-4 h-4 ml-3 flex-shrink-0" 
              style={{ color: textColor }}
              fill="currentColor" 
              viewBox="0 0 24 24"
            >
              <path d="M12 0l2.545 7.455L22 10l-7.455 2.545L12 20l-2.545-7.455L2 10l7.455-2.545L12 0z" />
            </svg>
          </div>
        ))}
      </div>

      {/* CSS Animation */}
      <style>{`
        @keyframes marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
};

export default MarqueeBanner;
