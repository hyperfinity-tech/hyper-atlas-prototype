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
    <div className="flex flex-col items-center justify-center py-20 text-center">
      {/* Dramatic hero section */}
      <div className="animate-slide-up">
        {/* Glowing orb element */}
        <div className="relative mb-10">
          <div className="w-24 h-24 rounded-full glass-glow flex items-center justify-center animate-glow-pulse">
            <span className="text-4xl font-bold text-gradient">?</span>
          </div>
          {/* Orbiting dots - signature Hyperfinity element */}
          <div className="absolute -top-3 -right-3 w-5 h-5 rounded-full bg-hyper-teal shadow-lg shadow-hyper-teal/50 animate-dot-pulse" />
          <div className="absolute -bottom-2 -left-4 w-4 h-4 rounded-full bg-hyper-pink shadow-lg shadow-hyper-pink/50 animate-dot-pulse delay-300" />
          <div className="absolute top-1/2 -right-5 w-3 h-3 rounded-full bg-hyper-blue shadow-lg shadow-hyper-blue/50 animate-dot-pulse delay-500" />
        </div>
      </div>

      {/* Display typography */}
      <div className="animate-slide-up delay-100">
        <h2 className="display-text mb-4">
          <span className="text-white/90">Navigate to </span>
          <span className="text-gradient text-glow">Knowledge</span>
        </h2>
      </div>
      
      <div className="animate-slide-up delay-200">
        <p className="text-white/40 max-w-md text-lg leading-relaxed mb-12 tracking-wide">
          Query HyperFinity best practices, solutions, and internal documentation.
        </p>
      </div>

      {/* Example questions - glass cards */}
      <div className="flex flex-row gap-4 w-full max-w-5xl flex-wrap justify-center animate-slide-up delay-300">
        {EXAMPLE_QUESTIONS.map((question, index) => (
          <button
            key={index}
            onClick={() => onQuestionClick?.(question)}
            className="glass-button text-left px-6 py-5 rounded-2xl transition-all duration-400 group flex-1 min-w-[240px] max-w-[320px]"
          >
            {/* Question number accent */}
            <div className="flex items-start gap-3">
              <span className="text-hyper-pink/60 text-xs font-bold tracking-widest mt-0.5">
                0{index + 1}
              </span>
              <span className="text-sm text-white/60 group-hover:text-white/90 transition-colors leading-relaxed">
                {question}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ThinkingIndicator() {
  return (
    <div className="flex justify-start animate-slide-up">
      <div className="flex gap-4 items-start">
        {/* Avatar */}
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full glass border border-hyper-pink/30">
          <div className="w-3 h-3 rounded-full bg-hyper-teal shadow-lg shadow-hyper-teal/50 animate-dot-pulse" />
        </div>

        {/* Thinking indicator */}
        <div className="flex items-center gap-3 px-6 py-4 glass rounded-2xl">
          <div className="w-2.5 h-2.5 rounded-full bg-hyper-pink shadow-lg shadow-hyper-pink/50 animate-thinking-1" />
          <div className="w-2.5 h-2.5 rounded-full bg-hyper-blue shadow-lg shadow-hyper-blue/50 animate-thinking-2" />
          <div className="w-2.5 h-2.5 rounded-full bg-hyper-teal shadow-lg shadow-hyper-teal/50 animate-thinking-3" />
          <span className="text-xs text-white/40 uppercase tracking-widest ml-2">Searching</span>
        </div>
      </div>
    </div>
  );
}

export function MessageList({ messages, isLoading, onSendMessage }: MessageListProps) {
  const lastMessage = messages[messages.length - 1];
  const isStreaming = lastMessage?.role === "assistant";
  const showThinking = isLoading && !isStreaming;

  return (
    <div className="mx-auto flex min-w-0 max-w-4xl flex-col gap-6 px-6 py-8">
      {messages.length === 0 && !isLoading && <Greeting onQuestionClick={onSendMessage} />}

      {messages.map((message, index) => (
        <div
          key={message.id}
          className={`flex animate-slide-up ${message.role === "user" ? "justify-end" : "justify-start"}`}
          style={{ animationDelay: `${index * 0.05}s` }}
        >
          {message.role === "assistant" && (
            <div className="flex gap-4 items-start max-w-[85%]">
              {/* Avatar */}
              <div className="flex size-11 shrink-0 items-center justify-center rounded-full glass border border-hyper-pink/30">
                <div className="w-3 h-3 rounded-full bg-hyper-teal shadow-sm shadow-hyper-teal/50" />
              </div>
              
              <div className="flex flex-col gap-3">
                {/* Message card */}
                <div className="glass rounded-2xl px-6 py-5 border-l-2 border-hyper-teal/50">
                  <div className="prose prose-sm prose-invert max-w-none 
                    [&_p]:text-white/80 [&_p]:leading-relaxed
                    [&_strong]:text-white [&_strong]:font-bold
                    [&_code]:text-hyper-teal [&_code]:bg-white/5 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm
                    [&_pre]:bg-white/5 [&_pre]:rounded-xl [&_pre]:border [&_pre]:border-white/10
                    [&_ul]:text-white/70 [&_ol]:text-white/70
                    [&_a]:text-hyper-blue [&_a]:no-underline hover:[&_a]:text-hyper-pink
                    [&_h1]:text-white [&_h2]:text-white [&_h3]:text-white
                    [&_blockquote]:border-l-hyper-pink [&_blockquote]:text-white/60">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                </div>
                
                {/* Citations */}
                {message.citations && message.citations.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {message.citations.map((citation) => (
                      <Citation key={citation.id} citation={citation} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {message.role === "user" && (
            <div className="max-w-[75%] rounded-2xl px-6 py-4 btn-glow text-white">
              <p className="whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
            </div>
          )}
        </div>
      ))}

      {showThinking && <ThinkingIndicator />}
    </div>
  );
}
