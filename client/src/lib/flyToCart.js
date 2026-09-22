// A small "reward" animation for adding an item to the cart: clones the
// item's image and arcs it toward whichever cart icon is actually on
// screen (desktop nav / mobile top bar / mobile bottom tab all render
// different DOM nodes tagged with the same marker attribute, and CSS
// media queries hide the ones that don't apply at the current width).
const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const findVisibleCartTarget = () => {
  const candidates = Array.from(document.querySelectorAll('[data-cart-icon-target]')).filter((el) => {
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });
  // When more than one is visible at once (e.g. a mobile top-bar icon and
  // a bottom tab-bar icon both rendered), the later one in DOM order is
  // the bottom tab — the more prominent "this is your cart" landing spot
  // on a mobile layout, so prefer it.
  return candidates[candidates.length - 1] || null;
};

export function flyToCart(sourceImgEl) {
  if (!sourceImgEl || prefersReducedMotion()) {
    return;
  }

  const target = findVisibleCartTarget();
  if (!target) {
    return;
  }

  const startRect = sourceImgEl.getBoundingClientRect();
  if (startRect.width === 0 || startRect.height === 0) {
    return;
  }
  const endRect = target.getBoundingClientRect();

  const clone = sourceImgEl.cloneNode(true);
  clone.removeAttribute('loading');
  Object.assign(clone.style, {
    position: 'fixed',
    left: `${startRect.left}px`,
    top: `${startRect.top}px`,
    width: `${startRect.width}px`,
    height: `${startRect.height}px`,
    margin: '0',
    borderRadius: '12px',
    objectFit: 'cover',
    zIndex: '9998',
    pointerEvents: 'none',
    willChange: 'transform, opacity',
  });
  document.body.appendChild(clone);

  const endX = endRect.left + endRect.width / 2 - (startRect.left + startRect.width / 2);
  const endY = endRect.top + endRect.height / 2 - (startRect.top + startRect.height / 2);

  const cleanup = () => clone.remove();

  const animation = clone.animate(
    [
      { transform: 'translate(0, 0) scale(1)', opacity: 1, offset: 0 },
      { transform: `translate(${endX * 0.55}px, ${endY * 0.45 - 50}px) scale(0.65)`, opacity: 1, offset: 0.55 },
      { transform: `translate(${endX}px, ${endY}px) scale(0.12)`, opacity: 0.25, offset: 1 },
    ],
    { duration: 650, easing: 'cubic-bezier(0.4, 0, 0.6, 1)' }
  );

  animation.onfinish = cleanup;
  animation.oncancel = cleanup;
}
