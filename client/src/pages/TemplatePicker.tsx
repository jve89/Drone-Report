// client/src/pages/TemplatePicker.tsx
import { useEffect, useState } from "react";
import { listTemplates } from "../api/templates";

type Template = { id: string; name: string; version: string };

export default function TemplatePicker({
  onSelect,
  onClose,
}: {
  onSelect: (template: Template) => void;
  onClose: () => void;
}) {
  const [templates, setTemplates] = useState<Template[]>([]);

  useEffect(() => {
    listTemplates().then(setTemplates).catch(() => setTemplates([]));
  }, []);

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center">
      <div className="bg-white rounded shadow p-4 w-[520px]">
        <div className="text-sm font-medium mb-2">Choose a template</div>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {templates.map((t) => (
            <button
              key={t.id}
              type="button"
              className="border rounded p-3 text-left hover:bg-gray-50"
              onClick={() => onSelect(t)}
            >
              <div className="text-sm font-medium">{t.name}</div>
              <div className="text-xs text-gray-500">{t.version}</div>
            </button>
          ))}
        </div>
        <div className="flex justify-end">
          <button className="px-3 py-2 border rounded" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
