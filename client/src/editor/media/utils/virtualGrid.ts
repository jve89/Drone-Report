// client/src/editor/media/utils/virtualGrid.ts
import { useCallback, useLayoutEffect, useState } from "react";

type Args = {
  itemCount: number;
  itemHeight: number;
  overscan?: number;
  containerRef: React.RefObject<HTMLElement>;
};

export function useVirtualGrid({
  itemCount,
  itemHeight,
  overscan = 8,
  containerRef,
}: Args) {
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(Math.min(itemCount, 50));

  const recalc = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    const scrollTop = el.scrollTop;
    const height = el.clientHeight || 0;

    const first = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visible = Math.ceil(height / itemHeight) + overscan * 2;
    const last = Math.min(itemCount, first + visible);

    setStart(Math.max(0, first));
    setEnd(Math.max(first, last));
  }, [containerRef, itemCount, itemHeight, overscan]);

  // Run on mount and whenever deps change
  useLayoutEffect(() => {
    recalc();
  }, [recalc, itemCount, itemHeight]);

  // Update on resize too
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    recalc();
    const ro = new ResizeObserver(recalc);
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef, recalc]);

  const onScroll = useCallback(() => recalc(), [recalc]);

  return { start, end, onScroll };
}
