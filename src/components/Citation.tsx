"use client";

import { useState } from "react";
import { Citation as CitationType } from "@/lib/types";

interface CitationProps {
  citation: CitationType;
}

export function Citation({ citation }: CitationProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <span className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1 rounded-md border bg-muted/50 px-2 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        <span className="max-w-[120px] truncate">{citation.sourceTitle}</span>
      </button>
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 top-full z-20 mt-1 w-80 rounded-lg border bg-popover p-3 shadow-lg">
            <div className="mb-2 flex items-start justify-between gap-2">
              <span className="font-medium text-sm">{citation.sourceTitle}</span>
              <button
                onClick={() => setIsOpen(false)}
                className="shrink-0 rounded p-0.5 hover:bg-muted"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            {citation.text && (
              <p className="text-xs text-muted-foreground line-clamp-4 mb-2">
                &ldquo;{citation.text}&rdquo;
              </p>
            )}
            {citation.sourceUri && (
              <a
                href={citation.sourceUri}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                View source
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3" />
                </svg>
              </a>
            )}
          </div>
        </>
      )}
    </span>
  );
}
