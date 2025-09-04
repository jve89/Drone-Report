// client/src/editor/TemplateDropdown.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { listTemplates } from "../api/templates";
import { useEditor } from "../state/editorStore";

type TSummary = { id: string; name: string; version?: string };

export default function TemplateDropdown() {
  const { template, selectTemplate } = useEditor();
  const [items, setItems] = useState<TSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const selectRef = useRef<HTMLSelectElement | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    listTemplates()
      .then((arr) => {
        if (!active) return;
        setItems(Array.isArray(arr) ? arr : []);
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
      // Try to open the native select UI where supported.
      try {
        // @ts-ignore
        if (typeof el.showPicker === "function") el.showPicker();
      } catch {}
    }
    window.addEventListener("open-template-dropdown", onOpen as EventListener);
    return () => window.removeEventListener("open-template-dropdown", onOpen as EventListener);
  }, []);

  const value = template?.id ?? "";
  const label = useMemo(() => {
    if (!template) return "No template";
    const ver = (template as any)?.version ?? "";
    return ver ? `${template.name} (${ver})` : template.name;
  }, [template]);

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600">Template</span>
      <select
        ref={selectRef}
        className="border rounded px-2 py-1 text-sm min-w-[220px]"
        value={value}
        onChange={(e) => selectTemplate(e.target.value)}
        disabled={loading}
        aria-label="Select template"
        title="Select a template"
      >
        <option value="">{loading ? "Loading…" : "Select a template…"}</option>
        {items.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}{t.version ? ` (${t.version})` : ""}
          </option>
        ))}
      </select>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  );
}
