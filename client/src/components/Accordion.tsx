// client/src/components/Accordion.tsx
import { ReactNode, useEffect, useMemo, useState } from "react";

type Item = { id: string; title: string; content: ReactNode };
type Props = {
  children: ReactNode;
  storageKey?: string;        // persist open panel IDs
  singleOpen?: boolean;       // only one open at a time
  defaultOpenId?: string;     // which panel opens first
};

export function Accordion({ children, storageKey, singleOpen, defaultOpenId }: Props) {
  const items = useMemo(() => {
    // Normalize children to a flat list of AccordionItem with props captured via React.cloneElement in child
    // We rely on AccordionItem registering via context
    return [] as Item[];
  }, []);

  // The simple approach: we parse children at render-time
  const parsed: Item[] = [];
  (Array.isArray(children) ? children : [children]).forEach((child: any) => {
    if (!child?.props?.__accordionItem) return;
    const { id, title, children: content } = child.props;
    parsed.push({ id, title, content });
  });

  const [openIds, setOpenIds] = useState<string[]>(() => {
    if (!storageKey) return defaultOpenId ? [defaultOpenId] : [];
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) return arr as string[];
      }
    } catch {}
    return defaultOpenId ? [defaultOpenId] : [];
  });

  useEffect(() => {
    if (!storageKey) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(openIds));
    } catch {}
  }, [openIds, storageKey]);

  function toggle(id: string) {
    setOpenIds((prev) => {
      const isOpen = prev.includes(id);
      if (singleOpen) return isOpen ? [] : [id];
      if (isOpen) return prev.filter((x) => x !== id);
      return [...prev, id];
    });
  }

  return (
    <div className="flex-1 min-h-0 overflow-auto">
      {parsed.map((it) => {
        const isOpen = openIds.includes(it.id);
        return (
          <section key={it.id} className="border-b">
            <button
              className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium bg-gray-50 hover:bg-gray-100"
              onClick={() => toggle(it.id)}
            >
              <span>{it.title}</span>
              <span className="ml-2 text-gray-500">{isOpen ? "▾" : "▸"}</span>
            </button>
            {isOpen && <div className="px-3 py-2 bg-white">{it.content}</div>}
          </section>
        );
      })}
    </div>
  );
}

type ItemProps = {
  id: string;
  title: string;
  children: ReactNode;
  __accordionItem?: true; // internal flag
};

export function AccordionItem(props: ItemProps) {
  // Marker component. The parent Accordion extracts id/title/children via props.
  return <div {...props} />;
}
AccordionItem.defaultProps = { __accordionItem: true } as Partial<ItemProps>;
