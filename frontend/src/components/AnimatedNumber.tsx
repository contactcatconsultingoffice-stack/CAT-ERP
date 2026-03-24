import { motion, useSpring, useTransform, useMotionValue } from "framer-motion";
import { useEffect } from "react";

export function AnimatedNumber({ value, precision = 0 }: { value: number; precision?: number }) {
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, {
    stiffness: 100,
    damping: 30,
  });

  const rounded = useTransform(springValue, (latest) => 
    latest.toFixed(precision)
  );

  useEffect(() => {
    motionValue.set(value);
  }, [value, motionValue]);

  return <motion.span>{rounded}</motion.span>;
}
