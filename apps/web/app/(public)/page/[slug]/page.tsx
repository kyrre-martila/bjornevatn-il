import { notFound } from "next/navigation";

import { getPageContentBySlug } from "../../../../lib/content";
import { renderBlock } from "./block-renderer";

export default async function GenericPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const content = await getPageContentBySlug(slug);

  if (!content) {
    notFound();
  }

  const renderedBlocks = await Promise.all(
    content.blocks.map(async (block) => ({
      id: block.id,
      node: await renderBlock(block),
    })),
  );

  return (
    <article>
      {renderedBlocks.map((block) => (
        <div key={block.id}>{block.node}</div>
      ))}
    </article>
  );
}
