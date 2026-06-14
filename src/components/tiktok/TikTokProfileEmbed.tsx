"use client";

import Script from "next/script";
import { useEffect } from "react";

type TikTokProfileEmbedProps = {
  username: string;
};

const VIDEO_FRAME_HEIGHT = 740;
const VIDEO_FRAME_WIDTH = 325;

function fixVideoContainerHeights(root: ParentNode) {
  root.querySelectorAll('[data-e2e="common-videoList-VideoContainer"]').forEach((container) => {
    const element = container as HTMLElement;
    element.style.height = "auto";
    element.style.minHeight = `${VIDEO_FRAME_HEIGHT}px`;
    element.style.maxHeight = "none";
    element.style.overflow = "visible";

    element.querySelectorAll("iframe").forEach((iframe) => {
      iframe.style.display = "block";
      iframe.style.width = `${VIDEO_FRAME_WIDTH}px`;
      iframe.style.height = `${VIDEO_FRAME_HEIGHT}px`;
      iframe.style.minHeight = `${VIDEO_FRAME_HEIGHT}px`;
      iframe.style.maxHeight = "none";
      iframe.style.border = "0";
    });

    element.querySelectorAll(":scope > div").forEach((child) => {
      const div = child as HTMLElement;
      div.style.height = "auto";
      div.style.minHeight = `${VIDEO_FRAME_HEIGHT}px`;
      div.style.maxHeight = "none";
    });
  });
}

export function TikTokProfileEmbed({ username }: TikTokProfileEmbedProps) {
  useEffect(() => {
    const runFix = () => fixVideoContainerHeights(document);

    runFix();

    const observer = new MutationObserver(() => {
      runFix();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    const interval = window.setInterval(runFix, 1000);
    window.setTimeout(() => window.clearInterval(interval), 15000);

    return () => {
      observer.disconnect();
      window.clearInterval(interval);
    };
  }, [username]);

  return (
    <>
      <blockquote
        className="tiktok-embed mx-auto"
        cite={`https://www.tiktok.com/@${username}`}
        data-unique-id={username}
        data-embed-type="creator"
        style={{ maxWidth: "100%", minWidth: 288, width: "100%" }}
      >
        <section>
          <a
            target="_blank"
            rel="noopener noreferrer"
            href={`https://www.tiktok.com/@${username}?refer=creator_embed`}
          >
            @{username}
          </a>
        </section>
      </blockquote>
      <Script src="https://www.tiktok.com/embed.js" strategy="lazyOnload" />
    </>
  );
}
