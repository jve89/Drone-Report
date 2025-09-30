// client/src/editor/onboarding/FirstRunBanner.tsx
import { useEditor } from "../../state/editorStore";

export default function FirstRunBanner() {
  const { template } = useEditor();
  if (template) return null;

  function triggerTemplateDropdown() {
    window.dispatchEvent(new CustomEvent("open-template-dropdown"));
  }

  return (
    <div className="w-full bg-amber-50 border-b border-amber-200 text-amber-900">
      <div className="max-w-screen-2xl mx-auto px-4 py-2 flex items-center justify-between">
        <div className="text-sm">
          Start by selecting a <span className="font-medium">template</span>. Then fill cover, add photos, annotate findings, export.
        </div>
        <button
          type="button"
          onClick={triggerTemplateDropdown}
          className="text-sm px-3 py-1.5 border border-amber-300 rounded hover:bg-amber-100"
        >
          Pick a template
        </button>
      </div>
    </div>
  );
}
