// client/src/export/html/renderBindings.ts
import { BindingContext, renderString, select } from "../../templates/bindings";

type TextBlock = { type: "text"; id: string; value: string };
type BadgeBlock = { type: "badge"; id: string; value: { label: string; color: string } };
type TableBlock = { type: "table"; id: string; rows: any[][] };
type ImageSlotBlock = { type: "image_slot"; id: string; url?: string };
type RepeaterBlock = { type: "repeater"; id: string; bind: string; children: Block[] };
// If you add more block types later, extend here.
export type Block = TextBlock | BadgeBlock | TableBlock | ImageSlotBlock | RepeaterBlock;

type Page = { id: string; name?: string; blocks: Block[] };
type TemplateDoc = { pages: Page[] };

/** Stable clone across Node/browser without requiring polyfills. */
function clone<T>(v: T): T {
  // @ts-ignore - structuredClone may not exist in older Node
  if (typeof structuredClone === "function") return structuredClone(v);
  return JSON.parse(JSON.stringify(v));
}

/** Safe wrapper: render a string template. Never throws. */
function safeRender(s: unknown, ctx: BindingContext): string {
  const src = typeof s === "string" ? s : "";
  if (!src) return "";
  try {
    return renderString(src, ctx);
  } catch {
    return "";
  }
}

/** Safe wrapper: select a collection. Returns an array or []. Never throws. */
function safeSelectArray(expr: unknown, ctx: BindingContext): any[] {
  const sel = typeof expr === "string" ? expr : "";
  if (!sel) return [];
  try {
    const v = select(sel, ctx);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function bindBlocks(blocks: Block[], ctx: BindingContext): Block[] {
  return (blocks ?? []).flatMap((b) => bindBlock(b, ctx));
}

export function bindBlock(block: Block, ctx: BindingContext): Block[] {
  if (block.type === "text") {
    return [{ ...block, value: safeRender((block as TextBlock).value, ctx) }];
  }

  if (block.type === "badge") {
    const src = (block as BadgeBlock).value?.label;
    const label = safeRender(src, ctx) || (typeof src === "string" ? src : "");
    return [{ ...block, value: { ...(block as BadgeBlock).value, label } }];
  }

  if (block.type === "repeater") {
    const coll = safeSelectArray((block as RepeaterBlock).bind, ctx);
    const out: Block[] = [];
    for (const item of coll) {
      const childCtx: BindingContext = { ...ctx, item };
      for (const ch of (block as RepeaterBlock).children || []) {
        out.push(...bindBlock(ch, childCtx));
      }
    }
    return out;
  }

  // Pass-through for non-binding blocks
  return [clone(block)];
}

export function bindTemplate(tpl: TemplateDoc, ctx: BindingContext): TemplateDoc {
  return {
    pages: (tpl.pages ?? []).map((p) => ({
      ...p,
      blocks: bindBlocks(p.blocks || [], ctx),
    })),
  };
}
