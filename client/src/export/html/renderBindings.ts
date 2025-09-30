// client/src/export/html/renderBindings.ts
import { BindingContext, renderString, select } from "../../templates/bindings";

type TextBlock = { type: "text"; id: string; value: string };
type BadgeBlock = { type: "badge"; id: string; value: { label: string; color: string } };
type TableBlock = { type: "table"; id: string; rows: any[][] };
type ImageSlotBlock = { type: "image_slot"; id: string; url?: string };
type ImageBlock = {
  type: "image";
  id: string;
  url?: string;
  alt?: string;
  fit?: "contain" | "cover" | "scale-down";
  opacity?: number;
  borderRadius?: number;
};
type RepeaterBlock = { type: "repeater"; id: string; bind: string; children: Block[] };
// Legacy utility
type RectBlock = { type: "rect"; id: string; label?: string };

export type Block =
  | TextBlock
  | BadgeBlock
  | TableBlock
  | ImageSlotBlock
  | ImageBlock
  | RepeaterBlock
  | RectBlock;

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
  // Back-compat: old templates with a rect labeled "Logo" -> export as an <img>
  if (block.type === "rect" && typeof (block as RectBlock).label === "string") {
    const label = (block as RectBlock).label as string;
    if (/logo/i.test(label)) {
      const url =
        safeRender("{{run.logo}}", ctx) ||
        safeRender("{{draft.logo}}", ctx) ||
        "";
      const out: ImageBlock = {
        type: "image",
        id: (block as any).id,
        url,
        alt: "Logo",
        fit: "contain",
        opacity: 100,
        borderRadius: 0,
      };
      return [out];
    }
  }

  if (block.type === "text") {
    return [{ ...block, value: safeRender((block as TextBlock).value, ctx) }];
  }

  if (block.type === "badge") {
    const src = (block as BadgeBlock).value?.label;
    const label = safeRender(src, ctx) || (typeof src === "string" ? src : "");
    return [{ ...block, value: { ...(block as BadgeBlock).value, label } }];
  }

  if (block.type === "image_slot") {
    const src = (block as ImageSlotBlock).url;
    const url = safeRender(src, ctx) || (typeof src === "string" ? src : "");
    return [{ ...block, url }];
  }

  if (block.type === "image") {
    const src = (block as ImageBlock).url;
    const url = safeRender(src, ctx) || (typeof src === "string" ? src : "");
    return [{ ...(block as ImageBlock), url }];
  }

  if (block.type === "repeater") {
    const coll = safeSelectArray((block as RepeaterBlock).bind, ctx);
    const out: Block[] = [];
    for (const item of coll) {
      const childCtx: BindingContext = { ...ctx, item };
      for (const ch of (block as RepeaterBlock).children || []) {
        out.push(...bindBlock(ch as Block, childCtx));
      }
    }
    return out;
  }

  // Pass-through
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
