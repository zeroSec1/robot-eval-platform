"use client";

import { useState } from "react";

const BTN =
  "inline-flex items-center gap-1.5 rounded-[2px] border border-border-strong px-2 py-1 text-[12px] text-faint transition-colors hover:border-border hover:text-text";

function openPopup(url: string) {
  window.open(url, "_blank", "noopener,noreferrer,width=640,height=540");
}

export function ShareButtons({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  const share = (network: "x" | "linkedin" | "hn") => {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(title);
    if (network === "x") {
      openPopup(`https://x.com/intent/post?text=${text}&url=${url}`);
    } else if (network === "linkedin") {
      openPopup(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`);
    } else {
      openPopup(`https://news.ycombinator.com/submitlink?u=${url}&t=${text}`);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (e.g. insecure context); leave the label as-is.
    }
  };

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-divider pt-4">
      <span className="text-[12px] text-mute">Share:</span>
      <button type="button" className={BTN} onClick={() => share("x")} aria-label="Share on X">
        <svg viewBox="0 0 24 24" className="h-3 w-3 fill-current" aria-hidden="true">
          <path d="M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.41l-5.8-7.58-6.64 7.58H.47l8.6-9.83L0 1.15h7.59l5.24 6.93 6.07-6.93Zm-1.29 19.5h2.04L6.49 3.24H4.3l13.31 17.41Z" />
        </svg>
        X
      </button>
      <button
        type="button"
        className={BTN}
        onClick={() => share("linkedin")}
        aria-label="Share on LinkedIn"
      >
        <svg viewBox="0 0 24 24" className="h-3 w-3 fill-current" aria-hidden="true">
          <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13Zm1.78 13.02H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.72v20.55C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.72C24 .77 23.2 0 22.22 0Z" />
        </svg>
        LinkedIn
      </button>
      <button
        type="button"
        className={BTN}
        onClick={() => share("hn")}
        aria-label="Share on Hacker News"
      >
        <svg viewBox="0 0 24 24" className="h-3 w-3 fill-current" aria-hidden="true">
          <path d="M0 24V0h24v24H0ZM6.95 5.9l4.15 7.75v4.45h1.8v-4.45l4.15-7.75h-2l-3.05 6.05L8.95 5.9h-2Z" />
        </svg>
        HN
      </button>
      <button type="button" className={BTN} onClick={copyLink} aria-label="Copy link to this post">
        <svg
          viewBox="0 0 24 24"
          className="h-3 w-3 fill-none stroke-current stroke-2"
          aria-hidden="true"
        >
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}
