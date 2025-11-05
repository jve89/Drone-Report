// client/src/editor/utils/createBlock.ts
import { BLOCK_DEFS, BlockKind } from "../blocks/defs";

export function createBlock(kind: BlockKind) {
  return {
    id: crypto.randomUUID(),
    blockStyle: {
      meta: {
        blockKind: kind,
        props: BLOCK_DEFS[kind].defaultProps,
      },
    },
  };
}
