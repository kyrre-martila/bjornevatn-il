import type { AdminMedia } from "../../lib/admin/media";

type ImageAssetProps = {
  asset?: Pick<AdminMedia, "url" | "altText" | "caption" | "width" | "height"> | null;
  src?: string | null;
  alt?: string | null;
  caption?: string | null;
  className?: string;
  imageClassName?: string;
  fallbackText?: string;
  loading?: "eager" | "lazy";
  showCaption?: boolean;
  sizes?: string;
};

export function ImageAsset({
  asset,
  src,
  alt,
  caption,
  className,
  imageClassName,
  fallbackText = "Image unavailable",
  loading = "lazy",
  showCaption = false,
  sizes = "100vw",
}: ImageAssetProps) {
  const resolvedSrc = asset?.url ?? src ?? null;
  const resolvedAlt = asset?.altText ?? alt ?? "";
  const resolvedCaption = asset?.caption ?? caption ?? null;
  const resolvedWidth = asset?.width ?? undefined;
  const resolvedHeight = asset?.height ?? undefined;

  if (!resolvedSrc) {
    return <div className={className ?? "image-asset image-asset--missing"}>{fallbackText}</div>;
  }

  return (
    <figure className={className ?? "image-asset"}>
      <img
        className={imageClassName ?? "image-asset__image"}
        src={resolvedSrc}
        alt={resolvedAlt.trim()}
        width={resolvedWidth}
        height={resolvedHeight}
        loading={loading}
        decoding="async"
        sizes={sizes}
      />
      {showCaption && resolvedCaption ? <figcaption className="image-asset__caption">{resolvedCaption}</figcaption> : null}
    </figure>
  );
}
