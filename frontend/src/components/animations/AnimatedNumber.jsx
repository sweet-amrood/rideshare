import { useEffect, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { springGentle } from '@/animations/motionConfig';

function parseNumeric(value) {
  if (value == null) return { num: 0, prefix: '', suffix: '' };
  const str = String(value);
  const match = str.match(/^([^0-9.-]*)(-?[\d.]+)(.*)$/);
  if (!match) return { num: 0, prefix: str, suffix: '' };
  return { prefix: match[1], num: parseFloat(match[2]) || 0, suffix: match[3] };
}

export default function AnimatedNumber({
  value,
  className = '',
  duration = 0.8
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const reduceMotion = useReducedMotion();
  const { prefix, num, suffix } = parseNumeric(value);
  const [display, setDisplay] = useState(reduceMotion ? num : 0);

  useEffect(() => {
    if (!inView || reduceMotion) {
      setDisplay(num);
      return undefined;
    }

    let frame;
    const start = performance.now();
    const from = 0;

    const tick = (now) => {
      const t = Math.min(1, (now - start) / (duration * 1000));
      const eased = 1 - (1 - t) ** 3;
      setDisplay(from + (num - from) * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, num, duration, reduceMotion]);

  const formatted =
    Number.isInteger(num) ? Math.round(display) : display.toFixed(1);

  return (
    <motion.span ref={ref} className={className} transition={springGentle}>
      {prefix}
      {formatted}
      {suffix}
    </motion.span>
  );
}
