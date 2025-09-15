// client/src/editor/Canvas.tsx
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { useEditor } from "../state/editorStore";
import { renderString, select } from "../templates/bindings";
import TextToolbar from "./blocks/TextToolbar";
import ShapeToolbar from "./blocks/ShapeToolbar";

const DR_MEDIA_MIME = "application/x-dr-media";

/** Local types (template blocks) */
type Rect = { x: number; y: number; w: number; h: number };
type BlockBase = { id: string; type: string; rect: Rect; label?: string; placeholder?: string; options?: any };
type BlockText = BlockBase & { type: "text"; value?: string };
type BlockImage = BlockBase & { type: "image_slot"; source?: string };
type BlockTable = BlockBase & { type: "table"; options?: { columns?: { key: string; label: string }[] } };
type BlockBadge = BlockBase & { type: "badge"; options?: { palette?: string } };
type BlockRepeater = BlockBase & {
  type: "repeater";
  bind?: string;
  options?: { previewCount?: number };
  children?: Array<BlockText | BlockImage | BlockBadge>;
};
type Block = BlockText | BlockImage | BlockTable | BlockBadge | BlockRepeater;

/** User element type mirrors (future) store shape */
type UserBlock =
  | {
      id: string;
      type: "text";
      rect: Rect; // 0–100
      value?: string;
      style?: {
        fontFamily?: string;
        fontSize?: number;
        bold?: boolean;
        italic?: boolean;
        underline?: boolean;
        align?: "left" | "center" | "right" | "justify";
        color?: string;
        lineHeight?: number;
        letterSpacing?: number;
      };
    }
  | {
      id: string;
      type: "line" | "divider";
      rect: Rect; // line uses rect.h for thickness at preview-time
      style?: {
        strokeColor?: string;
        strokeWidth?: number;
        dash?: number;
      };
    }
  | {
      id: string;
      type: "rect";
      rect: Rect;
      style?: {
        strokeColor?: string;
        strokeWidth?: number;
        dash?: number;
        fillColor?: string;
      };
    };

function pct(n: number) {
  return `${n}%`;
}

function Frame({
  rect, active, children, overflowVisible = false,
}: { rect: Rect; active: boolean; children: React.ReactNode; overflowVisible?: boolean }) {
  const style: React.CSSProperties = {
    position: "absolute",
    left: pct(rect.x), top: pct(rect.y),
    width: pct(rect.w), height: pct(rect.h),
    border: active ? "2px solid #3b82f6" : "1px dashed #e5e7eb",
    boxShadow: active ? "0 0 0 3px rgba(59,130,246,0.2)" : undefined,
    padding: 8,
    overflow: overflowVisible ? "visible" : "hidden",
    background: "rgba(255,255,255,0.9)",
    borderRadius: 4,
  };
  return <div style={style}>{children}</div>;
}

export default function Canvas() {
  const {
    draft,
    template,
    pageIndex,
    setValue,
    zoom,
    findings,
    insertImageAtPoint,
    guide,
    selectedBlockId,
    setSelectedBlock,
    guideNext,
    // history
    undo, redo,
    // Elements tool + user blocks
    tool,
    placeUserBlock,
    selectUserBlock,
    selectedUserBlockId,
    updateUserBlock,
    deleteUserBlock,
    cancelInsert,
  } = useEditor();

  const pageRef = useRef<HTMLDivElement>(null);

  // drag state for user blocks
  const dragRef = useRef<{
    mode: "move" | "resize-tl" | "resize-right";
    id: string;
    startX: number;
    startY: number;
    startRect: Rect;
  } | null>(null);
  const prevCursorRef = useRef<string>("");

  const PAGE_W = 820;
  const PAGE_H = 1160;
  const MIN_W = 6; // %
  const MIN_H = 6; // %

  // Binding context
  const ctx = useMemo(
    () => ({
      run: (draft as any)?.payload?.meta ?? {},
      draft: draft as any,
      findings: (findings as any[]) ?? [],
    }),
    [draft, findings]
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes(DR_MEDIA_MIME)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      if (!pageRef.current) return;
      const raw = e.dataTransfer.getData(DR_MEDIA_MIME);
      if (!raw) return;
      e.preventDefault();

      let payload: { draftId: string; id: string; url: string; filename?: string; kind?: string } | null = null;
      try {
        payload = JSON.parse(raw);
      } catch {
        payload = null;
      }
      if (!payload) return;
      if (!draft?.id || payload.draftId !== draft.id) return;

      const rect = pageRef.current.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const nx = Math.max(0, Math.min(100, (px / PAGE_W) * 100));
      const ny = Math.max(0, Math.min(100, (py / PAGE_H) * 100));

      const pageInstance = draft.pageInstances?.[pageIndex];
      if (!pageInstance) return;

      const ok = insertImageAtPoint?.(pageInstance.id, { x: nx, y: ny }, { id: payload.id, url: payload.url, filename: payload.filename || "", kind: payload.kind || "image" });
      if (!ok) {
        const tPage = template?.pages.find((p: any) => p.id === pageInstance.templatePageId);
        const firstImg = (tPage?.blocks || []).find((b: any) => b.type === "image_slot") as BlockImage | undefined;
        if (firstImg) {
          setValue(pageInstance.id, firstImg.id, payload.url);
          if (guide?.enabled && selectedBlockId === firstImg.id) guideNext();
        }
      }
    },
    [draft?.id, pageIndex, insertImageAtPoint, setValue, template?.pages, guide?.enabled, selectedBlockId, guideNext]
  );

  // Click-to-place for Elements insert mode
  const onCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (tool.mode !== "insert") return;
      if (!pageRef.current) return;

      const rect = pageRef.current.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;

      const nx = Math.max(0, Math.min(100, (px / rect.width) * 100));
      const ny = Math.max(0, Math.min(100, (py / rect.height) * 100));

      // Default size for text box (shapes will be wired once store supports them)
      const w = 40;
      const h = 8;
      const x = Math.min(nx, 100 - w);
      const y = Math.min(ny, 100 - h);

      placeUserBlock({ x, y, w, h });
    },
    [tool.mode, placeUserBlock]
  );

  const onCanvasBackgroundMouseDown = useCallback(
    () => {
      if (tool.mode === "insert") return;
      selectUserBlock(null);
    },
    [tool.mode, selectUserBlock]
  );

  // Global key handlers
  useEffect(() => {
    function isTypingInEditable(): boolean {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName;
      return el.isContentEditable || tag === "INPUT" || tag === "TEXTAREA";
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (tool.mode === "insert") {
          e.preventDefault();
          cancelInsert();
        } else if (selectedUserBlockId) {
          selectUserBlock(null);
        }
        return;
      }

      if (isTypingInEditable()) return;

      // Global Undo / Redo
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }

      if ((e.key === "Delete" || e.key === "Backspace") && !e.metaKey && !e.ctrlKey) {
        if (selectedUserBlockId) {
          e.preventDefault();
          deleteUserBlock(selectedUserBlockId);
        }
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tool.mode, selectedUserBlockId, cancelInsert, selectUserBlock, deleteUserBlock, undo, redo]);

  // Drag engine for user blocks
  useEffect(() => {
    function onMove(e: MouseEvent) {
      const d = dragRef.current;
      if (!d || !pageRef.current) return;

      const rect = pageRef.current.getBoundingClientRect();
      const dxPct = ((e.clientX - d.startX) / rect.width) * 100;
      const dyPct = ((e.clientY - d.startY) / rect.height) * 100;

      let { x, y, w, h } = d.startRect;

      if (d.mode === "move") {
        x = x + dxPct;
        y = y + dyPct;
      } else if (d.mode === "resize-right") {
        w = w + dxPct;
      } else if (d.mode === "resize-tl") {
        // anchor bottom-right
        x = x + dxPct;
        y = y + dyPct;
        w = w - dxPct;
        h = h - dyPct;
      }

      // enforce min sizes and bounds
      w = Math.max(MIN_W, w);
      h = Math.max(MIN_H, h);
      if (x < 0) {
        w += x; x = 0;
      }
      if (y < 0) {
        h += y; y = 0;
      }
      if (x + w > 100) w = 100 - x;
      if (y + h > 100) h = 100 - y;
      w = Math.max(MIN_W, w);
      h = Math.max(MIN_H, h);

      updateUserBlock(d.id, { rect: { x, y, w, h } });
    }

    function onUp() {
      if (dragRef.current) {
        dragRef.current = null;
        document.body.style.cursor = prevCursorRef.current || "";
      }
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [updateUserBlock]);

  function startDrag(mode: "move" | "resize-tl" | "resize-right", id: string, rect: Rect, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = { mode, id, startX: e.clientX, startY: e.clientY, startRect: rect };
    prevCursorRef.current = document.body.style.cursor;
    document.body.style.cursor = mode === "move" ? "move" : mode === "resize-right" ? "ew-resize" : "nwse-resize";
    selectUserBlock(id);
  }

  function renderBoundText(raw?: string) {
    if (!raw) return "";
    try {
      return renderString(raw, ctx);
    } catch {
      return "";
    }
  }

  function renderRepeater(b: BlockRepeater) {
    const rows = b.bind ? select(b.bind, ctx) : [];
    const items = Array.isArray(rows) ? rows : [];
    if (!items.length) {
      const count = Number((b.options?.previewCount ?? 0) as number);
      if (!count) return <div className="text-gray-400">No items.</div>;
      return (
        <div className="w-full h-full overflow-auto space-y-2 text-xs text-gray-600">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="border rounded p-2">
              Repeater preview #{i + 1}
            </div>
          ))}
        </div>
      );
    }
    return (
      <div className="w-full h-full overflow-auto space-y-3">
        {items.map((item: any, idx: number) => (
          <div key={idx} className="border rounded p-2">
            {(b.children || []).map((ch, ci) => {
              if (ch.type === "text") {
                const v = renderString(ch.value || "", { ...ctx, item });
                return (
                  <div key={ci} className="text-xs mb-1 whitespace-pre-wrap">
                    {v}
                  </div>
                );
              }
              if (ch.type === "image_slot") {
                const src = renderString((ch as any).source || "", { ...ctx, item });
                return src ? (
                  <img key={ci} src={src} className="w-full h-40 object-contain border rounded" />
                ) : (
                  <div key={ci} className="text-xs text-gray-400 border rounded h-40 grid place-items-center">
                    No image
                  </div>
                );
              }
              if (ch.type === "badge") {
                const lbl = renderString((ch as any).label || "", { ...ctx, item });
                return (
                  <span key={ci} className="inline-block px-2 py-1 rounded text-[11px] bg-amber-200 text-amber-900 mr-2">
                    {lbl}
                  </span>
                );
              }
              return null;
            })}
          </div>
        ))}
      </div>
    );
  }

  // -------- Render branches --------
  if (!draft) return <div className="p-6 text-gray-500">Loading editor…</div>;

  if (!template) {
    function openTemplateDropdown() {
      window.dispatchEvent(new CustomEvent("open-template-dropdown"));
    }
    return (
      <div className="w-full flex items-center justify-center bg-neutral-100 p-12">
        <div className="bg-white border rounded shadow-sm p-6 max-w-xl text-center">
          <div className="text-lg font-medium mb-2">Select a template to start</div>
          <p className="text-sm text-gray-600 mb-4">The workspace will populate with the template’s page stack.</p>
          <div className="flex items-center justify-center">
            <button onClick={openTemplateDropdown} className="px-3 py-2 border rounded hover:bg-gray-50">
              Pick a template
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-3">You can change templates later.</p>
        </div>
      </div>
    );
  }

  const pageInstance = draft.pageInstances?.[pageIndex];
  if (!pageInstance) return <div className="p-6 text-gray-500">No page to display</div>;

  const tPage = template.pages.find((p: any) => p.id === pageInstance.templatePageId);
  if (!tPage) return <div className="p-6 text-gray-500">Template page not found</div>;

  const blocks = (tPage.blocks ?? []) as Block[];
  const userBlocks: UserBlock[] = Array.isArray((pageInstance as any).userBlocks)
    ? ((pageInstance as any).userBlocks as UserBlock[])
    : [];

  const activeTextBlock =
    selectedUserBlockId
      ? (userBlocks.find(b => b.id === selectedUserBlockId && b.type === "text") as Extract<UserBlock, { type: "text" }> | undefined)
      : undefined;

  const activeShapeBlock =
    selectedUserBlockId
      ? (userBlocks.find(b =>
          b.id === selectedUserBlockId && (b.type === "line" || b.type === "rect" || b.type === "divider")
        ) as Extract<UserBlock, { type: "line" | "rect" | "divider" }> | undefined)
      : undefined;

  // Reserve vertical space when a toolbar is visible
  const showToolbar = !!activeTextBlock || !!activeShapeBlock;
  const toolbarHeight = 48; // px

  return (
    <div className="w-full flex items-start justify-center bg-neutral-100 p-6">
      <div
        className="relative"
        style={{
          width: PAGE_W * zoom,
          height: PAGE_H * zoom + (showToolbar ? toolbarHeight : 0),
          paddingTop: showToolbar ? toolbarHeight : 0,
        }}
      >
        {/* Floating toolbars */}
        {activeTextBlock && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30">
            <TextToolbar blockId={activeTextBlock.id} style={activeTextBlock.style || {}} />
          </div>
        )}
        {activeShapeBlock && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30">
            <ShapeToolbar
              blockId={activeShapeBlock.id}
              kind={activeShapeBlock.type as "line" | "rect" | "divider"}
              style={activeShapeBlock.style as any}
            />
          </div>
        )}

        <div
          ref={pageRef}
          className="relative bg-white shadow"
          style={{
            width: PAGE_W,
            height: PAGE_H,
            transform: `scale(${zoom})`,
            transformOrigin: "top left",
            cursor: tool.mode === "insert" ? "crosshair" : "default",
          }}
          onMouseDown={onCanvasBackgroundMouseDown}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onClick={onCanvasClick}
        >
          {/* Template blocks */}
          {blocks.map((b: Block) => {
            const v = (pageInstance.values as any)?.[b.id];
            const active = !!guide?.enabled && selectedBlockId === b.id;

            switch (b.type) {
              case "image_slot": {
                const boundSrc = (b as BlockImage).source ? renderBoundText((b as BlockImage).source) : "";
                const url = boundSrc || (typeof v === "string" ? v : "");
                return (
                  <Frame key={b.id} rect={b.rect} active={active}>
                    {url ? (
                      <img
                        src={url}
                        alt={b.id}
                        className="w-full h-full object-cover"
                        onClick={() => setSelectedBlock(b.id)}
                      />
                    ) : (
                      <label className="text-sm text-gray-500 cursor-pointer" onClick={() => setSelectedBlock(b.id)}>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const localUrl = URL.createObjectURL(file);
                            setValue(pageInstance.id, b.id, localUrl);
                            if (active) guideNext();
                          }}
                        />
                        Click to add image
                      </label>
                    )}
                  </Frame>
                );
              }

              case "text": {
                const hasBinding = typeof (b as BlockText).value === "string";
                const content = hasBinding
                  ? renderBoundText((b as BlockText).value)
                  : (typeof v === "string" && v) || b.placeholder || "";
                return (
                  <Frame key={b.id} rect={b.rect} active={active}>
                    {hasBinding ? (
                      <div className="w-full h-full text-sm whitespace-pre-wrap">{content}</div>
                    ) : (
                      <div
                        contentEditable
                        suppressContentEditableWarning
                        className="w-full h-full outline-none"
                        onFocus={() => setSelectedBlock(b.id)}
                        onBlur={(e) => {
                          setValue(pageInstance.id, b.id, e.currentTarget.textContent || "");
                          if (active) guideNext();
                        }}
                      >
                        {content}
                      </div>
                    )}
                  </Frame>
                );
              }

              case "badge": {
                const val = v && typeof v === "object" ? (v as { label?: string; color?: string }) : {};
                const color = val.color || "gray";
                const label = val.label || "Badge";
                const palette: Record<string, string> = {
                  gray: "bg-gray-200 text-gray-800",
                  blue: "bg-blue-200 text-blue-800",
                  amber: "bg-amber-200 text-amber-900",
                  red: "bg-red-200 text-red-800",
                  green: "bg-green-200 text-green-800",
                };
                return (
                  <Frame key={b.id} rect={b.rect} active={active}>
                    <span className={`inline-block px-2 py-1 rounded text-xs ${palette[color] || palette.gray}`}>{label}</span>
                  </Frame>
                );
              }

              case "table": {
                const rows: any[] = Array.isArray(v) ? v : [];
                const cols = (b.options?.columns ?? []) as { key: string; label: string }[];
                return (
                  <Frame key={b.id} rect={b.rect} active={active}>
                    <div className="overflow-auto w-full h-full">
                      <table className="min-w-full text-xs border">
                        <thead className="bg-gray-50">
                          <tr>{cols.map((c) => (<th key={c.key} className="px-2 py-1 text-left border-b">{c.label}</th>))}</tr>
                        </thead>
                        <tbody>
                          {rows.map((r, ri) => (
                            <tr key={ri} className="border-b align-top">
                              {cols.map((c) => (<td key={c.key} className="px-2 py-1">{r?.[c.key] ?? ""}</td>))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Frame>
                );
              }

              case "repeater": {
                return (
                  <Frame key={b.id} rect={b.rect} active={active}>
                    {renderRepeater(b as BlockRepeater)}
                  </Frame>
                );
              }
            }
            return null;
          })}

          {/* User elements with move + resize handles */}
          {userBlocks.map((ub) => {
            const active = selectedUserBlockId === ub.id;

            if (ub.type === "text") {
              const st = ub.style || {};
              const textareaStyle: React.CSSProperties = {
                color: st.color,
                fontFamily: st.fontFamily,
                fontSize: st.fontSize ? `${st.fontSize}px` : undefined,
                fontWeight: st.bold ? (700 as React.CSSProperties["fontWeight"]) : 400,
                fontStyle: st.italic ? "italic" : "normal",
                textDecoration: st.underline ? "underline" : "none",
                lineHeight: st.lineHeight ? String(st.lineHeight) : undefined,
                letterSpacing: st.letterSpacing != null ? `${st.letterSpacing}px` : undefined,
                textAlign: st.align || "left",
                unicodeBidi: "plaintext",
              };

              return (
                <Frame key={ub.id} rect={ub.rect} active={active} overflowVisible>
                  <textarea
                    className="w-full h-full outline-none resize-none bg-transparent"
                    dir="ltr"
                    style={textareaStyle}
                    value={ub.value || ""}
                    onMouseDown={(e) => { e.stopPropagation(); selectUserBlock(ub.id); }}
                    onFocus={() => selectUserBlock(ub.id)}
                    onChange={(e) => updateUserBlock(ub.id, { value: e.target.value })}
                    onKeyDown={(e) => {
                      const meta = e.metaKey || e.ctrlKey;
                      if (!meta) return;
                      if (e.key.toLowerCase() === "b") {
                        e.preventDefault();
                        updateUserBlock(ub.id, { style: { bold: !(st as any).bold } as any });
                      } else if (e.key.toLowerCase() === "i") {
                        e.preventDefault();
                        updateUserBlock(ub.id, { style: { italic: !(st as any).italic } as any });
                      } else if (e.key.toLowerCase() === "u") {
                        e.preventDefault();
                        updateUserBlock(ub.id, { style: { underline: !(st as any).underline } as any });
                      }
                    }}
                  />
                  {active && (
                    <>
                      <div
                        title="Resize"
                        onMouseDown={(e) => startDrag("resize-tl", ub.id, ub.rect, e)}
                        style={{
                          position: "absolute",
                          left: -10,
                          top: -10,
                          width: 16,
                          height: 16,
                          borderRadius: 9999,
                          background: "#fff",
                          border: "1px solid #94a3b8",
                          boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                          cursor: "nwse-resize",
                        }}
                      />
                      <div
                        title="Resize width"
                        onMouseDown={(e) => startDrag("resize-right", ub.id, ub.rect, e as any)}
                        style={{
                          position: "absolute",
                          right: -8,
                          top: "50%",
                          transform: "translateY(-50%)",
                          width: 12,
                          height: 20,
                          borderRadius: 4,
                          background: "#fff",
                          border: "1px solid #94a3b8",
                          boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                          cursor: "ew-resize",
                        }}
                      />
                      <div
                        title="Move"
                        onMouseDown={(e) => startDrag("move", ub.id, ub.rect, e as any)}
                        style={{
                          position: "absolute",
                          left: "50%",
                          bottom: -28,
                          transform: "translateX(-50%)",
                          width: 28,
                          height: 28,
                          borderRadius: 9999,
                          background: "#fff",
                          border: "1px solid #94a3b8",
                          display: "grid",
                          placeItems: "center",
                          boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                          cursor: "move",
                          userSelect: "none",
                          fontSize: 14,
                        }}
                      >
                        ⤧
                      </div>
                    </>
                  )}
                </Frame>
              );
            }

            // ---- Shapes (preview) ----
            if (ub.type === "line" || ub.type === "divider") {
              const st = (ub.style || {}) as any;
              const stroke = st.strokeColor || "#111827";
              const strokeW = Number.isFinite(st.strokeWidth) ? st.strokeWidth : (ub.type === "divider" ? 2 : 2);
              const dash = Number.isFinite(st.dash) ? st.dash : 0;

              return (
                <div
                  key={ub.id}
                  style={{
                    position: "absolute",
                    left: pct(ub.rect.x),
                    top: pct(ub.rect.y + ub.rect.h / 2 - (strokeW / PAGE_H) * 50), // center
                    width: pct(ub.rect.w),
                    height: Math.max(1, strokeW),
                    background: dash ? "transparent" : stroke,
                    borderTop: dash ? `${strokeW}px dashed ${stroke}` : undefined,
                    cursor: "default",
                  }}
                  onMouseDown={(e) => { e.stopPropagation(); selectUserBlock(ub.id); }}
                />
              );
            }

            if (ub.type === "rect") {
              const st = (ub.style || {}) as any;
              const stroke = st.strokeColor || "#111827";
              const strokeW = Number.isFinite(st.strokeWidth) ? st.strokeWidth : 1;
              const dash = Number.isFinite(st.dash) ? st.dash : 0;
              const fill = st.fillColor || "transparent";

              return (
                <div
                  key={ub.id}
                  style={{
                    position: "absolute",
                    left: pct(ub.rect.x),
                    top: pct(ub.rect.y),
                    width: pct(ub.rect.w),
                    height: pct(ub.rect.h),
                    border: `${strokeW}px ${dash ? "dashed" : "solid"} ${stroke}`,
                    background: fill,
                    borderRadius: 4,
                    cursor: "default",
                  }}
                  onMouseDown={(e) => { e.stopPropagation(); selectUserBlock(ub.id); }}
                />
              );
            }

            return null;
          })}
        </div>
      </div>
    </div>
  );
}
