// client/src/editor/TemplateDropdown.tsx
import { useEffect, useMemo, useState } from "react";
import { listTemplates } from "../api/templates";
import { useEditor } from "../state/editorStore";

// API shape kept simple
type TSummary = { id: string; name: string; version?: string };

export default function TemplateDropdown() {
  const { template, selectTemplate } = useEditor();
  const [items, setItems] = useState<TSummary[]>([]);
  const [loading, setLoading] = useState(false);

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
        className="border rounded px-2 py-1 text-sm min-w-[220px]"
        value={value}
        onChange={(e) => selectTemplate(e.target.value)}
        disabled={loading}
        aria-label="Select template"
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
