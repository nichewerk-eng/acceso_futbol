import Image from "next/image";
import Link from "next/link";
import { siteConfig } from "@/config/site";

type BrandLogoProps = {
  size?: "sm" | "md" | "lg";
  showName?: boolean;
  className?: string;
};

const sizes = {
  sm: { image: 44, className: "h-11 w-11" },
  md: { image: 64, className: "h-16 w-16" },
  lg: { image: 140, className: "h-32 w-32 sm:h-36 sm:w-36" },
} as const;

export function BrandLogo({
  size = "md",
  showName = false,
  className = "",
}: BrandLogoProps) {
  const { image, className: imageClass } = sizes[size];

  return (
    <Link href="/" className={`inline-flex items-center gap-3 ${className}`}>
      <Image
        src="/logo.png"
        alt={`${siteConfig.name} logo`}
        width={image}
        height={image}
        className={`${imageClass} object-contain drop-shadow-[0_4px_24px_rgba(240,120,32,0.25)]`}
        priority={size !== "sm"}
      />
      {showName && (
        <span className="font-display text-lg font-bold uppercase tracking-[0.12em] text-white">
          {siteConfig.name}
        </span>
      )}
    </Link>
  );
}
