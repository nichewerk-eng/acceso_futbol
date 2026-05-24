import { BrandLogo } from "@/components/BrandLogo";
import { BroadcastTicker } from "@/components/home/BroadcastTicker";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TikTok",
  robots: { index: false, follow: false },
};

export default function TikTokEmbedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-bg-1 text-white">
      <div className="border-b border-white/10 bg-bg-1/90 px-4 py-3">
        <div className="mx-auto flex max-w-6xl justify-center">
          <BrandLogo size="sm" showName />
        </div>
      </div>
      <BroadcastTicker />
      {children}
    </div>
  );
}
