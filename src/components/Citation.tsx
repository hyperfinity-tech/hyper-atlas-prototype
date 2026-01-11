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
        className="glass-button inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-white/80 transition-all duration-200 hover:text-hyper-teal"
      >
        {/* Mini signature dot */}
        <div className="w-2 h-2 rounded-full bg-hyper-blue shadow-sm shadow-hyper-blue/50" />
        <span className="max-w-[140px] truncate">{citation.sourceTitle}</span>
      </button>
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 top-full z-20 mt-2 w-80 glass-strong rounded-2xl p-4 animate-slide-up">
            {/* Header */}
            <div className="mb-3 flex items-start justify-between gap-2 pb-2 border-b border-white/10">
              <span className="font-semibold text-sm text-white">
                {citation.sourceTitle}
              </span>
              <button
                onClick={() => setIsOpen(false)}
                className="shrink-0 rounded-full p-1 hover:bg-white/10 transition-colors text-white/60 hover:text-white"
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
              <p className="text-sm text-white/70 mb-3 leading-relaxed">
                <span className="text-hyper-pink text-lg font-bold">&ldquo;</span>
                {citation.text}
                <span className="text-hyper-pink text-lg font-bold">&rdquo;</span>
              </p>
            )}
            {citation.sourceUri && (
              <a
                href={citation.sourceUri}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-hyper-teal hover:text-hyper-pink transition-colors"
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
