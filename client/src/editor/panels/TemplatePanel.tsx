// client/src/editor/panels/TemplatePanel.tsx
import React, { useMemo } from "react";
import { useEditor } from "../../state/editorStore";

export default function TemplatePanel() {
  const { template, draft } = useEditor();

  const pages = useMemo(() => (template as any)?.pages ?? [], [template]);
  const version = (template as any)?.version ? ` ${(template as any).version}` : "";

  return (
    <div className="p-3 border-b">
      <div className="text-sm font-medium mb-2">Template &amp; Theme</div>

      {!template ? (
        <div className="text-xs text-gray-600">
          No template selected. Use the dropdown in the top bar to begin.
        </div>
      ) : (
        <div className="text-xs text-gray-700 space-y-2">
          <div>
            <div className="text-gray-500">Selected</div>
            <div className="font-medium">
              {template.name}
              {version}
            </div>
          </div>

          <div>
            <div className="text-gray-500">Pages</div>
            {pages.length ? (
              <ol className="list-decimal list-inside" aria-label="Template pages">
                {pages.map((p: any) => (
                  <li key={p.id}>{p.name || p.kind || p.id}</li>
                ))}
              </ol>
            ) : (
              <div className="text-gray-500">No pages defined.</div>
            )}
          </div>

          <div className="text-gray-500">
            Draft ID{" "}
            <span className="text-gray-700">{draft?.id ?? "—"}</span>
          </div>
        </div>
      )}
    </div>
  );
}
