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

export function bindBlocks(blocks: Block[], ctx: BindingContext): Block[] {
  return blocks.flatMap((b) => bindBlock(b, ctx));
}

export function bindBlock(block: Block, ctx: BindingContext): Block[] {
  if (block.type === "text") {
    return [{ ...block, value: renderString(block.value, ctx) }];
  }
  if (block.type === "badge") {
    const label =
      typeof block.value?.label === "string" ? renderString(block.value.label, ctx) : block.value?.label;
    return [{ ...block, value: { ...block.value, label } }];
  }
  if (block.type === "repeater") {
    const coll = select(block.bind || "", ctx);
    const out: Block[] = [];
    for (const item of coll) {
      const childCtx: BindingContext = { ...ctx, item };
      for (const ch of block.children || []) {
        out.push(...bindBlock(ch, childCtx));
      }
    }
    return out;
  }
  // Pass-through for non-binding blocks
  return [structuredClone(block)];
}

export function bindTemplate(tpl: TemplateDoc, ctx: BindingContext): TemplateDoc {
  return {
    pages: tpl.pages.map((p) => ({
      ...p,
      blocks: bindBlocks(p.blocks || [], ctx),
    })),
  };
}
