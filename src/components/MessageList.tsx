"use client";

import ReactMarkdown from "react-markdown";
import { Message } from "@/lib/types";
import { Citation } from "./Citation";

interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
}

function Greeting() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-primary"
        >
          <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold mb-2">Welcome to Atlas</h2>
      <p className="text-muted-foreground max-w-sm">
        Ask a question about your documents and I&apos;ll help you find the answer.
      </p>
    </div>
  );
}

function ThinkingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 ring-1 ring-border">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-primary"
          >
            <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <span className="animate-pulse">Thinking</span>
          <span className="animate-bounce [animation-delay:0.1s]">.</span>
          <span className="animate-bounce [animation-delay:0.2s]">.</span>
          <span className="animate-bounce [animation-delay:0.3s]">.</span>
        </div>
      </div>
    </div>
  );
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  return (
    <div className="mx-auto flex min-w-0 max-w-3xl flex-col gap-4 px-4 py-6 md:gap-6">
      {messages.length === 0 && !isLoading && <Greeting />}

      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
        >
          {message.role === "assistant" && (
            <div className="flex gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 ring-1 ring-border">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-primary"
                >
                  <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div className="flex flex-col gap-2 max-w-[calc(100%-3rem)]">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>
                {message.citations && message.citations.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {message.citations.map((citation) => (
                      <Citation key={citation.id} citation={citation} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {message.role === "user" && (
            <div
              className="max-w-[80%] rounded-2xl px-4 py-2.5 text-white"
              style={{ backgroundColor: "#0066ff" }}
            >
              <p className="whitespace-pre-wrap break-words">{message.content}</p>
            </div>
          )}
        </div>
      ))}

      {isLoading && <ThinkingIndicator />}
    </div>
  );
}
