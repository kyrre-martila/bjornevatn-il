import Image, { ImageProps } from "next/image";

export type LogoProps = {
  className?: string;
} & Pick<ImageProps, "width" | "height">;

export default function Logo({ className, width = 160, height = 40 }: LogoProps) {
  return (
    <Image
      src="/brand/blueprint-logo-horizontal.svg"
      alt="Blueprint"
      width={width}
      height={height}
      priority
      className={className}
    />
  );
}
