import { useCallback, useRef, useState } from 'react';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function useInView({ threshold = 0.15, once = true } = {}) {
  const [isInView, setIsInView] = useState(prefersReducedMotion);
  const observerRef = useRef(null);

  const ref = useCallback(
    (node) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }

      if (!node || prefersReducedMotion()) {
        return;
      }

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            if (once) {
              observer.disconnect();
              observerRef.current = null;
            }
          } else if (!once) {
            setIsInView(false);
          }
        },
        { threshold }
      );

      observer.observe(node);
      observerRef.current = observer;
    },
    [threshold, once]
  );

  return [ref, isInView];
}

export default useInView;
