import { useEffect, useRef, useState } from 'react';

const SWIPE_THRESHOLD_PX = 40;

export default function PromoCarousel({ slides, intervalMs = 5000 }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const timerRef = useRef(null);
  const touchStartXRef = useRef(null);
  const touchDeltaXRef = useRef(0);

  const slideCount = slides.length;
  const multiSlide = slideCount > 1;

  useEffect(() => {
    if (activeIndex >= slideCount) {
      setActiveIndex(0);
    }
  }, [slideCount, activeIndex]);

  const goTo = (index) => {
    setActiveIndex(((index % slideCount) + slideCount) % slideCount);
  };

  const goNext = () => goTo(activeIndex + 1);
  const goPrev = () => goTo(activeIndex - 1);

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startTimer = () => {
    stopTimer();
    if (!multiSlide) {
      return;
    }
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    timerRef.current = setInterval(() => {
      setActiveIndex((current) => (current + 1) % slideCount);
    }, intervalMs);
  };

  useEffect(() => {
    startTimer();
    return stopTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slideCount, intervalMs]);

  const handleTouchStart = (event) => {
    touchStartXRef.current = event.touches[0].clientX;
    touchDeltaXRef.current = 0;
    stopTimer();
  };

  const handleTouchMove = (event) => {
    if (touchStartXRef.current === null) {
      return;
    }
    touchDeltaXRef.current = event.touches[0].clientX - touchStartXRef.current;
  };

  const handleTouchEnd = () => {
    if (touchDeltaXRef.current > SWIPE_THRESHOLD_PX) {
      goPrev();
    } else if (touchDeltaXRef.current < -SWIPE_THRESHOLD_PX) {
      goNext();
    }
    touchStartXRef.current = null;
    touchDeltaXRef.current = 0;
    startTimer();
  };

  if (slideCount === 0) {
    return null;
  }

  return (
    <div
      className="menu-hero promo-carousel"
      role="region"
      aria-roledescription="carousel"
      onMouseEnter={multiSlide ? stopTimer : undefined}
      onMouseLeave={multiSlide ? startTimer : undefined}
      onTouchStart={multiSlide ? handleTouchStart : undefined}
      onTouchMove={multiSlide ? handleTouchMove : undefined}
      onTouchEnd={multiSlide ? handleTouchEnd : undefined}
    >
      <div
        className="promo-track"
        style={{ transform: `translateX(-${activeIndex * 100}%)` }}
      >
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`promo-slide ${slide.imageUrl ? '' : 'promo-slide-fallback'}`}
            style={slide.imageUrl ? { backgroundImage: `url(${slide.imageUrl})` } : undefined}
            aria-hidden={index !== activeIndex}
          >
            <div className="menu-hero-overlay promo-slide-overlay">{slide.content}</div>
          </div>
        ))}
      </div>

      {multiSlide ? (
        <>
          <button type="button" className="promo-arrow promo-arrow-prev" onClick={goPrev} aria-label="Previous slide">
            ‹
          </button>
          <button type="button" className="promo-arrow promo-arrow-next" onClick={goNext} aria-label="Next slide">
            ›
          </button>
          <div className="promo-dots">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                className={`promo-dot ${index === activeIndex ? 'promo-dot-active' : ''}`}
                onClick={() => goTo(index)}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
