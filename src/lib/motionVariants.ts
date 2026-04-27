/**
 * Reusable Framer Motion variants for DABAR.
 * Tuned for the parchment aesthetic — slow, deliberate, never bouncy.
 */

export const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: {
    duration: 0.7,
    delay,
    ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
  },
});

export const fadeUpView = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: {
    duration: 0.5,
    delay,
    ease: "easeOut" as const,
  },
});

/** Reduced-motion safe variant — collapses delay/duration to 0. */
export const fadeUpViewReduced = () => ({
  initial: { opacity: 1, y: 0 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0 },
});

export { motion, AnimatePresence } from "framer-motion";