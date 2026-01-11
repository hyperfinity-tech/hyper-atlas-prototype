"use client";

import { useState, FormEvent, KeyboardEvent, useRef, useEffect } from "react";

interface MessageInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function MessageInput({ onSend, disabled }: MessageInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (input.trim() && !disabled) {
      onSend(input.trim());
      setInput("");
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="glass-input flex items-end gap-4 rounded-2xl p-4 transition-all duration-400">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything about HyperFinity..."
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none border-0 bg-transparent p-2 text-base text-white outline-none placeholder:text-white/30 focus-visible:outline-none focus-visible:ring-0 disabled:opacity-50 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] leading-relaxed"
          style={{ maxHeight: "200px" }}
        />
        <button
          type="submit"
          disabled={disabled || !input.trim()}
          className="flex size-12 shrink-0 items-center justify-center rounded-xl btn-glow text-white transition-all duration-300 disabled:opacity-30 disabled:shadow-none disabled:transform-none group"
        >
          {disabled ? (
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-white/70 animate-thinking-1" />
              <div className="w-1.5 h-1.5 rounded-full bg-white/70 animate-thinking-2" />
              <div className="w-1.5 h-1.5 rounded-full bg-white/70 animate-thinking-3" />
            </div>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          )}
        </button>
      </div>
    </form>
  );
}
