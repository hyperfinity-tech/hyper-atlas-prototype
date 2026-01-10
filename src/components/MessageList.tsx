"use client";

import ReactMarkdown from "react-markdown";
import { Message } from "@/lib/types";
import { Citation } from "./Citation";

interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
  onSendMessage?: (message: string) => void;
}

const EXAMPLE_QUESTIONS = [
  "What's the latest thinking on Feature Store?",
  "NBA - what is it?",
  "I need to deliver a presentation on HyperFinity's approach to Measurement, give me some pointers",
];

function Greeting({ onQuestionClick }: { onQuestionClick?: (question: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center animate-slide-up">
      {/* Animated brand element - cluster of signature dots */}
      <div className="relative mb-8">
        <div className="w-16 h-16 rounded-full bg-hyper-pink border-[3px] border-black flex items-center justify-center shadow-lg">
          <span className="text-2xl text-white font-bold" style={{ fontFamily: 'var(--font-heading)' }}>?</span>
        </div>
        {/* Orbiting accent dots */}
        <div className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-hyper-teal border-2 border-black animate-dot-pulse" />
        <div className="absolute -bottom-1 -left-3 w-3 h-3 rounded-full bg-hyper-blue border-2 border-black animate-dot-pulse" style={{ animationDelay: '0.5s' }} />
      </div>

      <h2 className="text-2xl font-bold mb-3 tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
        Welcome to <span className="text-hyper-pink">Atlas</span>
      </h2>
      <p className="text-hyper-gray max-w-md text-lg leading-relaxed mb-8">
        Query HyperFinity Best Practices & Solutions.
      </p>

      {/* Example questions */}
      <div className="flex flex-row gap-3 w-full max-w-4xl flex-wrap justify-center">
        {EXAMPLE_QUESTIONS.map((question, index) => (
          <button
            key={index}
            onClick={() => onQuestionClick?.(question)}
            className="text-left px-4 py-3 rounded-xl border-2 border-border bg-muted/30 hover:border-hyper-pink hover:bg-hyper-pink/5 transition-all duration-200 group flex-1 min-w-[200px] max-w-[280px]"
            style={{ animationDelay: `${0.1 + index * 0.1}s` }}
          >
            <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
              {question}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ThinkingIndicator() {
  return (
    <div className="flex justify-start animate-slide-up">
      <div className="flex gap-3">
        {/* Branded avatar */}
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-black border-2 border-hyper-pink">
          <div className="w-3 h-3 rounded-full bg-hyper-teal animate-dot-pulse" />
        </div>

        {/* Branded thinking dots */}
        <div className="flex items-center gap-2 px-4 py-3 bg-muted rounded-full">
          <div className="w-2 h-2 rounded-full bg-hyper-pink animate-thinking-1" />
          <div className="w-2 h-2 rounded-full bg-hyper-blue animate-thinking-2" />
          <div className="w-2 h-2 rounded-full bg-hyper-teal animate-thinking-3" />
        </div>
      </div>
    </div>
  );
}

export function MessageList({ messages, isLoading, onSendMessage }: MessageListProps) {
  // Show thinking indicator only when loading AND we haven't started streaming yet
  const lastMessage = messages[messages.length - 1];
  const isStreaming = lastMessage?.role === "assistant";
  const showThinking = isLoading && !isStreaming;

  return (
    <div className="mx-auto flex min-w-0 max-w-3xl flex-col gap-4 px-4 py-6 md:gap-6">
      {messages.length === 0 && !isLoading && <Greeting onQuestionClick={onSendMessage} />}

      {messages.map((message, index) => (
        <div
          key={message.id}
          className={`flex animate-slide-up ${message.role === "user" ? "justify-end" : "justify-start"}`}
          style={{ animationDelay: `${index * 0.05}s` }}
        >
          {message.role === "assistant" && (
            <div className="flex gap-3">
              {/* Hyperfinity branded avatar */}
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-black border-2 border-hyper-pink">
                <div className="w-3 h-3 rounded-full bg-hyper-teal" />
              </div>
              <div className="flex flex-col gap-2 max-w-[calc(100%-3rem)]">
                {/* Message content with teal left accent */}
                <div className="bg-muted/60 rounded-2xl px-4 py-3 border-l-2 border-hyper-teal">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
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
            <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-hyper-pink text-white shadow-md">
              <p className="whitespace-pre-wrap break-words">{message.content}</p>
            </div>
          )}
        </div>
      ))}

      {showThinking && <ThinkingIndicator />}
    </div>
  );
}
