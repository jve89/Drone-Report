// client/src/editor/panels/TemplatePanel.tsx
import { useEditor } from "../../state/editorStore";

export default function TemplatePanel() {
  const { template, draft } = useEditor();

  return (
    <div className="p-3 border-b">
      <div className="text-sm font-medium mb-2">Template & Theme</div>

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
              {(template as any).version ? ` ${(template as any).version}` : ""}
            </div>
          </div>

          <div>
            <div className="text-gray-500">Pages</div>
            <ol className="list-decimal list-inside">
              {(template as any).pages?.map((p: any) => (
                <li key={p.id}>{p.name || p.kind || p.id}</li>
              )) ?? null}
            </ol>
          </div>

          <div className="text-gray-500">
            Draft ID <span className="text-gray-700">{draft?.id}</span>
          </div>
        </div>
      )}
    </div>
  );
}
