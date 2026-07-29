import { Metadata } from "next";
import MediaKitView from "@/components/mediakit/MediaKitView";
import { mediaKit } from "@/config/mediaKit";

export const metadata: Metadata = {
  title: "Media Kit",
  description:
    "Acceso Futbol media kit: alcance, audiencia, geografía y resultados en Facebook, TikTok, YouTube Shorts e Instagram.",
  openGraph: {
    title: "Acceso Futbol | Media Kit",
    description:
      "Marca de medios en español de Liga MX y la Selección Mexicana. Alcance, audiencia y resultados verificables.",
    images: [{ url: "/logo.png", width: 512, height: 331, alt: mediaKit.meta.title }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Acceso Futbol | Media Kit",
    images: ["/logo.png"],
  },
};

export default function MediaKitPage() {
  return <MediaKitView />;
}
