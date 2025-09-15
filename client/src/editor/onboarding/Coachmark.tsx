// client/src/editor/onboarding/Coachmark.tsx
// Coachmark helper balloon — disabled as of v0.3.9.
// The old code is preserved below for reference, but not executed.

export default function Coachmark() {
  return null;
}

/* --- Disabled old implementation ---
import { useEffect, useState } from "react";
import { useEditor } from "../../state/editorStore";

export default function Coachmark() {
  const { template } = useEditor();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!template);
  }, [template]);

  if (!visible) return null;

  function openTemplateDropdown() {
    window.dispatchEvent(new CustomEvent("open-template-dropdown"));
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-40">
      <div className="absolute top-3 right-3 pointer-events-auto">
        <div className="rounded-lg shadow-lg bg-white border p-3 text-sm max-w-xs">
          <div className="font-medium mb-1">Select a template first</div>
          <div className="text-gray-600">
            Use the Template menu to load a report structure.
          </div>
          <div className="mt-2">
            <button
              onClick={openTemplateDropdown}
              className="px-3 py-1.5 border rounded hover:bg-gray-50"
            >
              Open template menu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
--- end disabled ---
*/
