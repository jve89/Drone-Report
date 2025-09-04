// client/src/editor/panels/StartChecklist.tsx
import { useEditor } from "../../state/editorStore";

type Step = {
  key: string;
  label: string;
  action?: () => void;
  done: boolean;
};

export default function StartChecklist() {
  const { template } = useEditor();

  const steps: Step[] = [
    {
      key: "template",
      label: "Select a template",
      action: () => window.dispatchEvent(new CustomEvent("open-template-dropdown")),
      done: !!template,
    },
    { key: "cover", label: "Fill the cover page", done: false },
    { key: "media", label: "Add photos", done: false },
    { key: "annotate", label: "Annotate findings", done: false },
    { key: "export", label: "Export", done: false },
  ];

  return (
    <div className="p-3 border-t bg-white">
      <div className="font-medium mb-2">Start Checklist</div>
      <ol className="space-y-2">
        {steps.map((s, i) => (
          <li key={s.key} className="flex items-start gap-2">
            <span
              className={`mt-0.5 inline-flex items-center justify-center w-5 h-5 rounded-full text-xs border ${
                s.done ? "bg-green-600 text-white border-green-600" : "bg-gray-100 text-gray-700 border-gray-300"
              }`}
            >
              {s.done ? "✓" : i + 1}
            </span>
            <div className="flex-1">
              <div className={`text-sm ${s.done ? "text-gray-500 line-through" : "text-gray-900"}`}>{s.label}</div>
              {!s.done && s.action && (
                <button
                  onClick={s.action}
                  className="mt-1 text-xs px-2 py-1 border rounded hover:bg-gray-50"
                >
                  Do this
                </button>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
