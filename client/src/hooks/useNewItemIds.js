import { useEffect, useRef, useState } from 'react';

// Tracks which ids in `items` just showed up since the last render, so a
// live-refreshing list (e.g. an order queue refetched on a socket event)
// can flash/highlight only the genuinely new arrivals instead of every
// card on every refresh. The very first population is the baseline, not
// "new" — otherwise a page's initial load would flag its whole list.
export function useNewItemIds(items, { idKey = '_id', durationMs = 4000 } = {}) {
  const [newIds, setNewIds] = useState(() => new Set());
  const knownIdsRef = useRef(null);
  const timersRef = useRef(new Map());

  useEffect(() => {
    const currentIds = new Set(items.map((item) => item[idKey]));

    if (knownIdsRef.current === null) {
      knownIdsRef.current = currentIds;
      return;
    }

    const freshlyArrived = [...currentIds].filter((id) => !knownIdsRef.current.has(id));
    knownIdsRef.current = currentIds;

    if (freshlyArrived.length === 0) {
      return;
    }

    setNewIds((prev) => {
      const next = new Set(prev);
      freshlyArrived.forEach((id) => next.add(id));
      return next;
    });

    freshlyArrived.forEach((id) => {
      if (timersRef.current.has(id)) {
        clearTimeout(timersRef.current.get(id));
      }
      const timer = setTimeout(() => {
        setNewIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        timersRef.current.delete(id);
      }, durationMs);
      timersRef.current.set(id, timer);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, idKey, durationMs]);

  useEffect(
    () => () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
    },
    []
  );

  return newIds;
}
