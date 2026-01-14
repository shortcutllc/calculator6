import { Plus } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { motion, useInView, useAnimationFrame } from 'motion/react';

interface ChecklistItem {
  id: string;
  text: string;
  boldText?: string; // Optional: the part of text to bold
}

interface FeatureCard {
  id: string;
  title: string;
  items: ChecklistItem[];
  description: string;
  color: {
    card: string;
    cardBorder: string;
    checkbox: string;
    checkboxBorder: string;
    text: string;
    ctaBg: string;
    ctaText: string;
    iconBg: string;
  };
  ctaText: string;
}

interface ShortcutSectionProps {
  headline: string;
  subheadline: string;
  cards: FeatureCard[];
}

// Gradient mask SVG as data URL
const MASK_GRADIENT = "data:image/svg+xml,%3Csvg%20preserveAspectRatio%3D%22none%22%20width%3D%22100%25%22%20height%3D%22100%25%22%20overflow%3D%22visible%22%20style%3D%22display%3A%20block%3B%22%20viewBox%3D%220%200%20475.72%20314.91%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%0A%3Crect%20id%3D%22Mask%22%20width%3D%22475.72%22%20height%3D%22314.91%22%20fill%3D%22url(%23paint0_linear_1_95)%22%2F%3E%0A%3Cdefs%3E%0A%3ClinearGradient%20id%3D%22paint0_linear_1_95%22%20x1%3D%22237.86%22%20y1%3D%220%22%20x2%3D%22237.86%22%20y2%3D%22314.91%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%0A%3Cstop%20stop-opacity%3D%220%22%2F%3E%0A%3Cstop%20offset%3D%220.5%22%2F%3E%0A%3Cstop%20offset%3D%221%22%20stop-opacity%3D%220%22%2F%3E%0A%3C%2FlinearGradient%3E%0A%3C%2Fdefs%3E%0A%3C%2Fsvg%3E%0A";

function CheckIcon({ color }: { color: string }) {
  return (
    <svg
      className="block size-full"
      fill="none"
      preserveAspectRatio="none"
      viewBox="0 0 14.3715 9.7279"
    >
      <path
        d="M 1.215 4.8045 L 5.06625 8.5125 L 13.15675 1.215"
        stroke={color}
        strokeLinecap="square"
        strokeWidth="2.43"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      className="block size-full"
      fill="none"
      preserveAspectRatio="none"
      viewBox="0 0 19.7345 19.7345"
    >
      <path
        d="M 9.86725 4.11175 L 9.86725 15.6228"
        stroke="white"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3.28917"
      />
      <path
        d="M 4.11175 9.86725 L 15.6228 9.86725"
        stroke="white"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3.28917"
      />
    </svg>
  );
}

function FeatureCardComponent({ 
  card, 
  isActive, 
  onClick,
  index 
}: { 
  card: FeatureCard; 
  isActive: boolean;
  onClick: () => void;
  index: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });
  const [hasRevealed, setHasRevealed] = useState(false);
  
  // Continuous auto-scroll animation
  const [yOffset, setYOffset] = useState(0);
  
  // Track when the reveal animation is complete
  useEffect(() => {
    if (isInView && !hasRevealed) {
      // Delay starting the scroll until after bullets have revealed
      // Last bullet starts at 200ms * 4 = 800ms, duration 400ms = completes at 1200ms
      const timer = setTimeout(() => {
        setHasRevealed(true);
      }, 1400); // Start scrolling after all bullets are revealed
      return () => clearTimeout(timer);
    }
  }, [isInView, hasRevealed]);
  
  useAnimationFrame((time) => {
    if (!hasRevealed) return; // Don't scroll until bullets are revealed
    
    // Smooth continuous scroll - faster speed for better visual effect
    const speed = 0.15;
    setYOffset((prev) => {
      const newOffset = (prev - speed) % 528; // 6 items * 88px (52px space + 36px line height)
      return newOffset;
    });
  });

  return (
    <motion.div 
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 60 }}
      transition={{ 
        duration: 0.6,
        delay: index * 0.15,
        ease: [0.21, 0.47, 0.32, 0.98]
      }}
      className="relative rounded-[24px] overflow-hidden cursor-pointer"
      style={{ fontFamily: "'Outfit', sans-serif" }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Main card body */}
      <div
        className="border border-solid rounded-[24px] pb-0"
        style={{
          backgroundColor: card.color.card,
          borderColor: card.color.cardBorder,
        }}
      >
        {/* Title and icon button */}
        <div className="relative px-8 pt-[52px] pb-6">
          <h3
            className="text-[37px] leading-[43px] tracking-[-0.95px] m-0 font-medium"
            style={{ color: '#001f1f' }}
          >
            {card.title}
          </h3>
          
          {/* Icon button - top right */}
          <motion.button
            className="absolute right-8 top-8 flex items-center justify-center"
            style={{ width: '40px', height: '40px' }}
            aria-label={`Expand ${card.title}`}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <motion.div
              className="rounded-[20px] flex items-center justify-center"
              style={{
                width: '40px',
                height: '40px',
                backgroundColor: card.color.iconBg,
              }}
              animate={{ rotate: isActive ? 45 : 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              <div style={{ width: '20px', height: '20px' }}>
                <PlusIcon />
              </div>
            </motion.div>
          </motion.button>
        </div>

        {/* Checklist items with mask and scroll effect */}
        <div 
          className="relative px-8 pb-6 overflow-hidden"
          style={{
            height: '315px',
            position: 'relative',
          }}
        >
          {/* Mask overlay */}
          <div
            className="absolute inset-0 pointer-events-none z-10"
            style={{
              maskImage: `url('${MASK_GRADIENT}')`,
              WebkitMaskImage: `url('${MASK_GRADIENT}')`,
              maskSize: '100% 100%',
              WebkitMaskSize: '100% 100%',
              maskRepeat: 'no-repeat',
              WebkitMaskRepeat: 'no-repeat',
              backgroundColor: card.color.card,
            }}
          />
          
          {/* Scrolling checklist items */}
          <motion.div 
            className="relative"
            style={{ y: yOffset }}
          >
            <div className="space-y-[52px]">
              {/* Render items twice for seamless loop */}
              {[...card.items, ...card.items].map((item, idx) => {
                const isFirstSet = idx < card.items.length;
                const itemIndex = idx % card.items.length;
                
                return (
                  <motion.div 
                    key={`${item.id}-${idx}`} 
                    className="flex items-center gap-[11px]"
                    initial={{ opacity: 0, y: 8 }}
                    animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
                    transition={{
                      duration: 0.35,
                      delay: itemIndex * 0.18,
                      ease: [0.25, 0.1, 0.25, 1]
                    }}
                  >
                    {/* Checkbox */}
                    <div
                      className="flex-shrink-0 rounded-[17px] border-2 border-solid flex items-center justify-center"
                      style={{
                        width: '33px',
                        height: '33px',
                        backgroundColor: card.color.checkbox,
                        borderColor: card.color.checkboxBorder,
                      }}
                    >
                      <div style={{ width: '15px', height: '10px' }}>
                        <CheckIcon color={card.color.text} />
                      </div>
                    </div>
                    
                    {/* Item text */}
                    <p
                      className="m-0 text-[27px] leading-[36px] font-medium"
                      style={{ 
                        color: card.color.text,
                        // Bullet 1 gets slightly stronger presence
                        opacity: itemIndex === 0 ? 1 : 0.95
                      }}
                    >
                      {item.boldText ? (
                        <>
                          {item.text.split(item.boldText).map((part, i) => (
                            <span key={i}>
                              {part}
                              {i < item.text.split(item.boldText).length - 1 && (
                                <strong className="font-bold">{item.boldText}</strong>
                              )}
                            </span>
                          ))}
                        </>
                      ) : (
                        item.text
                      )}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* Description */}
        <motion.div 
          className="px-8 pb-8"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{
            duration: 0.6,
            delay: index * 0.15 + 0.3,
            ease: 'easeOut'
          }}
        >
          <p
            className="m-0 text-[19px] leading-[26px] font-normal opacity-64"
            style={{ color: card.color.text }}
          >
            {card.description}
          </p>
        </motion.div>
      </div>

      {/* CTA strip - attached to bottom */}
      <motion.div
        className="rounded-b-[24px] border-t-0 border-r border-b border-l border-solid flex items-center justify-center"
        style={{
          height: '82px',
          backgroundColor: card.color.ctaBg,
          borderColor: card.color.cardBorder,
        }}
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : { opacity: 0 }}
        transition={{
          duration: 0.5,
          delay: index * 0.15 + 0.4,
          ease: 'easeOut'
        }}
        whileHover={{ 
          backgroundColor: card.color.iconBg,
          transition: { duration: 0.2 }
        }}
      >
        <p
          className="m-0 text-[18px] leading-[26px] font-medium text-center"
          style={{ color: card.color.ctaText }}
        >
          {card.ctaText}
        </p>
      </motion.div>
    </motion.div>
  );
}

export default function ShortcutSection({ headline, subheadline, cards }: ShortcutSectionProps) {
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const headerRef = useRef(null);
  const isHeaderInView = useInView(headerRef, { once: true, amount: 0.5 });

  return (
    <div className="w-full" style={{ fontFamily: "'Outfit', sans-serif" }}>
      {/* Header section */}
      <div ref={headerRef} className="max-w-[1200px] mx-auto px-6 mb-12 text-center">
        <motion.h1 
          className="text-[61px] leading-[63px] tracking-[-1.5px] font-medium mb-8 text-[#001f1f]"
          initial={{ opacity: 0, y: 30 }}
          animate={isHeaderInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ 
            duration: 0.7,
            ease: [0.21, 0.47, 0.32, 0.98]
          }}
        >
          {headline}
        </motion.h1>
        <motion.p 
          className="text-[23px] leading-[31px] font-normal text-[#001f1f] max-w-[620px] mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={isHeaderInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ 
            duration: 0.7,
            delay: 0.15,
            ease: [0.21, 0.47, 0.32, 0.98]
          }}
        >
          {subheadline}
        </motion.p>
      </div>

      {/* Cards grid */}
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {cards.map((card, index) => (
            <FeatureCardComponent 
              key={card.id} 
              card={card}
              index={index}
              isActive={activeCardId === card.id}
              onClick={() => setActiveCardId(activeCardId === card.id ? null : card.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}