// client/src/editor/onboarding/FirstRunBanner.tsx
import { useEditor } from "../../state/editor";

const OPEN_TEMPLATE_EVENT = "open-template-dropdown";

export default function FirstRunBanner() {
  const { template } = useEditor();
  if (template) return null;

  const openTemplateMenu = () => {
    window.dispatchEvent(new CustomEvent(OPEN_TEMPLATE_EVENT));
  };

  return (
    <div
      className="w-full bg-amber-50 border-b border-amber-200 text-amber-900"
      role="region"
      aria-label="First run helper"
    >
      <div className="max-w-screen-2xl mx-auto px-4 py-2 flex items-center justify-between gap-3">
        <p className="text-sm m-0">
          Start by selecting a <span className="font-medium">template</span>. Then fill the cover,
          add photos, annotate findings, and export.
        </p>
        <button
          type="button"
          onClick={openTemplateMenu}
          className="text-sm px-3 py-1.5 border border-amber-300 rounded hover:bg-amber-100"
          aria-label="Open template picker"
        >
          Pick a template
        </button>
      </div>
    </div>
  );
}
