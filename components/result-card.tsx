"use client";

import { CopyButton } from "./copy-button";

interface ResultCardProps {
  shortUrl: string;
  clicks: number;
}

export function ResultCard({ shortUrl, clicks }: ResultCardProps) {
  return (
    <div className="mx-auto mt-8 max-w-xl animate-fade-slide-up">
      <div className="rounded-2xl border border-white/70 bg-white/60 p-5 shadow-lg shadow-rose-200/10 backdrop-blur-2xl sm:p-6">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-rose-400">
          Link rút gọn của bạn
        </p>

        <div className="flex items-center gap-3 rounded-xl bg-white/70 px-4 py-3">
          <svg
            className="size-5 shrink-0 text-rose-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
            />
          </svg>

          <code className="flex-1 truncate text-sm font-medium text-gray-800 sm:text-base">
            {shortUrl}
          </code>

          <CopyButton text={shortUrl} />
        </div>

        {clicks > 0 && (
          <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-400">
            <svg
              className="size-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.833.23l-1.833 1.833M5.167 4.733l1.833 1.833M21.25 12h-2.25m-15 0H1.75m15.99 5.24l1.833 1.833M7.426 17.24l-1.833 1.833"
              />
            </svg>
            {clicks} lượt click
          </div>
        )}
      </div>
    </div>
  );
}
