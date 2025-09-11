// client/src/editor/media/utils/virtualGrid.ts
import { useCallback, useLayoutEffect, useState } from "react";

type Args = {
  itemCount: number;
  itemHeight: number;
  overscan?: number;
  containerRef: React.RefObject<HTMLElement>;
};

export function useVirtualGrid({ itemCount, itemHeight, overscan = 8, containerRef }: Args) {
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(Math.min(itemCount, 50));

  const recalc = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const scrollTop = el.scrollTop;
    const height = el.clientHeight;
    const first = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visible = Math.ceil(height / itemHeight) + overscan * 2;
    const last = Math.min(itemCount, first + visible);
    setStart(first);
    setEnd(last);
  }, [containerRef, itemCount, itemHeight, overscan]);

  useLayoutEffect(() => {
    recalc();
  }, [recalc, itemCount, itemHeight]);

  const onScroll = useCallback(() => recalc(), [recalc]);

  return { start, end, onScroll };
}
