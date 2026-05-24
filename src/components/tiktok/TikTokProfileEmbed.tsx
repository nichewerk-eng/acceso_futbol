"use client";

import Script from "next/script";

type TikTokProfileEmbedProps = {
  username: string;
};

export function TikTokProfileEmbed({ username }: TikTokProfileEmbedProps) {
  return (
    <>
      <blockquote
        className="tiktok-embed mx-auto"
        cite={`https://www.tiktok.com/@${username}`}
        data-unique-id={username}
        data-embed-type="creator"
        style={{ maxWidth: 720, minWidth: 288 }}
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
