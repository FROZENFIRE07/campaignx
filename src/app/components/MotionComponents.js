'use client';

import { motion } from 'framer-motion';

// ── Animated Gradient Background ──
export function AnimatedGradientBackground() {
  return (
    <div className="animated-gradient-bg" aria-hidden="true">
      <motion.div
        className="animated-gradient-blob animated-gradient-blob-1"
        animate={{
          x: [0, 80, -60, 40, 0],
          y: [0, -50, 30, -80, 0],
          scale: [1, 1.15, 0.95, 1.1, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <motion.div
        className="animated-gradient-blob animated-gradient-blob-2"
        animate={{
          x: [0, -70, 50, -30, 0],
          y: [0, 60, -40, 70, 0],
          scale: [1, 0.9, 1.12, 0.95, 1],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <motion.div
        className="animated-gradient-blob animated-gradient-blob-3"
        animate={{
          x: [0, 50, -80, 60, 0],
          y: [0, -70, 50, -30, 0],
          scale: [1, 1.1, 0.9, 1.05, 1],
        }}
        transition={{
          duration: 35,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </div>
  );
}

// ── AI Processing Dots ──
const dotContainerVariants = {
  animate: {
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const dotVariants = {
  animate: {
    scale: [1, 1.5, 1],
    opacity: [0.4, 1, 0.4],
    transition: {
      duration: 1.2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

export function ProcessingDots({ color = 'var(--accent-primary)', size = 6 }) {
  return (
    <motion.div
      variants={dotContainerVariants}
      animate="animate"
      style={{ display: 'inline-flex', alignItems: 'center', gap: size * 0.8 }}
    >
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          variants={dotVariants}
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            background: color,
            display: 'block',
          }}
        />
      ))}
    </motion.div>
  );
}

// ── Motion Card (hover lift + scale + shadow) ──
export function MotionCard({ children, className = '', style = {}, ...props }) {
  return (
    <motion.div
      className={className}
      style={style}
      whileHover={{
        y: -4,
        scale: 1.02,
        boxShadow: '0 12px 30px -8px rgba(0, 0, 0, 0.35)',
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// ── Motion Button (hover scale + tap shrink) ──
export function MotionButton({ children, className = '', style = {}, onClick, disabled, ...props }) {
  return (
    <motion.button
      className={className}
      style={style}
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? {} : { scale: 1.05 }}
      whileTap={disabled ? {} : { scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      {...props}
    >
      {children}
    </motion.button>
  );
}

// ── Staggered Container (for page entrance animations) ──
const staggerContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

const staggerItemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

export function StaggerContainer({ children, className = '', style = {} }) {
  return (
    <motion.div
      className={className}
      style={style}
      variants={staggerContainerVariants}
      initial="hidden"
      animate="visible"
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className = '', style = {} }) {
  return (
    <motion.div className={className} style={style} variants={staggerItemVariants}>
      {children}
    </motion.div>
  );
}
