// client/src/editor/blocks/primitives/TableBlock.tsx
import React, { useEffect, useState } from "react";

export type TableData = string[][];

export interface TableBlockProps {
  data?: TableData;
  onChange?: (data: TableData) => void;
  readOnly?: boolean;
}

/**
 * Generic editable table block.
 * - Pure cell editing only (no add/remove UI here).
 * - Add/remove rows/cols is handled by the editor’s floating toolbar or section wrapper.
 */
export const TableBlock: React.FC<TableBlockProps> = ({
  data = [[""]],
  onChange,
  readOnly = false,
}) => {
  const [table, setTable] = useState<TableData>(data);

  // Keep in sync with upstream (when selection changes, undo/redo, etc.)
  useEffect(() => {
    setTable(data);
  }, [data]);

  const updateCell = (ri: number, ci: number, val: string) => {
    const next = table.map((row, r) =>
      row.map((cell, c) => (r === ri && c === ci ? val : cell))
    );
    setTable(next);
    onChange?.(next);
  };

  return (
    <div className="w-full h-full overflow-auto bg-white">
      <table className="min-w-full text-xs border-collapse">
        <tbody>
          {table.map((row, ri) => (
            <tr key={ri} className="border-t">
              {row.map((cell, ci) => (
                <td key={ci} className="border p-1 align-top">
                  {readOnly ? (
                    <div className="min-w-[60px]">{cell}</div>
                  ) : (
                    <input
                      type="text"
                      className="w-full outline-none"
                      value={cell}
                      onChange={(e) => updateCell(ri, ci, e.target.value)}
                    />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
