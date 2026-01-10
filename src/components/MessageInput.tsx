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
      <div
        className="flex items-end gap-3 rounded-2xl border-2 border-transparent bg-white p-3 shadow-lg transition-all duration-200 focus-within:border-hyper-pink focus-within:shadow-xl"
        style={{
          boxShadow: 'var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)'
        }}
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What would you like to know?"
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none border-0 bg-transparent p-2 text-base outline-none placeholder:text-hyper-gray focus-visible:outline-none focus-visible:ring-0 disabled:opacity-50 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          style={{ maxHeight: "200px" }}
        />
        <button
          type="submit"
          disabled={disabled || !input.trim()}
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-hyper-pink text-white transition-all duration-200 hover:bg-hyper-pink-hover hover:scale-105 active:scale-95 disabled:bg-hyper-gray disabled:cursor-not-allowed group"
        >
          {disabled ? (
            // Branded loading dots
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-thinking-1" />
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-thinking-2" />
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-thinking-3" />
            </div>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-transform group-hover:translate-x-0.5"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          )}
        </button>
      </div>
    </form>
  );
}
