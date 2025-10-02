// client/src/editor/TemplateDropdown.tsx
import { useEffect, useId, useRef, useState } from "react";
import { listTemplates } from "../api/templates";
import { useEditor } from "../state/editor";

type TSummary = { id: string; name: string; version?: string };

export default function TemplateDropdown() {
  const { template, selectTemplate } = useEditor();
  const [items, setItems] = useState<TSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const selectRef = useRef<HTMLSelectElement | null>(null);
  const selectId = useId();

  useEffect(() => {
    let active = true;
    setLoading(true);
    listTemplates()
      .then((arr) => {
        if (!active) return;
        const list = Array.isArray(arr) ? arr : [];
        // Ensure Clean/Blank comes first even if server order changes
        const preferredId = "blank-v1";
        const sorted = list.slice().sort((a, b) => {
          if (a.id === preferredId) return -1;
          if (b.id === preferredId) return 1;
          return a.name.localeCompare(b.name);
        });
        setItems(sorted);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  // Listen for onboarding event to open/focus the control.
  useEffect(() => {
    function onOpen() {
      const el = selectRef.current;
      if (!el) return;
      el.focus();
      try {
        // @ts-ignore — showPicker is not yet in TS libdom
        if (typeof el.showPicker === "function") el.showPicker();
      } catch {}
    }
    window.addEventListener("open-template-dropdown", onOpen);
    return () => window.removeEventListener("open-template-dropdown", onOpen);
  }, []);

  const value = template?.id ?? "";

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    if (!id || id === value) return;
    selectTemplate(id);
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={selectId} className="text-sm text-gray-600">
        Template
      </label>
      <select
        id={selectId}
        ref={selectRef}
        className="border rounded px-2 py-1 text-sm min-w-[220px]"
        value={value}
        onChange={handleChange}
        disabled={loading}
        aria-label="Select template"
        aria-busy={loading}
        title="Select a template"
      >
        <option value="" disabled>
          {loading ? "Loading…" : "Select a template…"}
        </option>
        {items.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
            {t.version ? ` (${t.version})` : ""}
          </option>
        ))}
      </select>
    </div>
  );
}
