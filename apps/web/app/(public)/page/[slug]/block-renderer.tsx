import type { ContentBlock } from "../../../../lib/content";
import { getBlockDefinition } from "./blocks/block-registry";

export async function renderBlock(block: ContentBlock) {
  const registryEntry = getBlockDefinition(block.type);

  if (!registryEntry) {
    console.warn(`Unknown block type \"${block.type}\" encountered; skipping render.`);
    return null;
  }

  const parsed = registryEntry.schema.validate(block.data);
  if (!parsed.valid) {
    console.warn(`Invalid block data for type \"${block.type}\"; skipping render.`);
    return null;
  }

  return registryEntry.renderer(parsed.data);
}
