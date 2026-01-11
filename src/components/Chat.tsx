"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { Message, Citation } from "@/lib/types";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [useCuratedOnly, setUseCuratedOnly] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (container) {
      const { scrollTop, scrollHeight, clientHeight } = container;
      setIsAtBottom(scrollHeight - scrollTop - clientHeight < 50);
    }
  }, []);

  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom();
    }
  }, [messages, isAtBottom, scrollToBottom]);

  const sendMessage = async (content: string) => {
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content,
    };

    const assistantMessageId = crypto.randomUUID();

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          history: messages,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      setMessages((prev) => [
        ...prev,
        {
          id: assistantMessageId,
          role: "assistant",
          content: "",
        },
      ]);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body");
      }

      let accumulatedContent = "";
      let citations: Citation[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === "text") {
                accumulatedContent += data.content;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: accumulatedContent }
                      : msg
                  )
                );
              } else if (data.type === "citations") {
                citations = data.citations;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
                      ? { ...msg, citations }
                      : msg
                  )
                );
              } else if (data.type === "error") {
                throw new Error(data.message);
              }
            } catch (e) {
              if (line.slice(6).trim()) {
                console.warn("Failed to parse SSE data:", e);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
      };
      setMessages((prev) => {
        const filtered = prev.filter(
          (msg) => !(msg.role === "assistant" && msg.content === "")
        );
        return [...filtered, errorMessage];
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-dvh flex-col relative">
      {/* ══════════════════════════════════════════════════════════
          DECORATIVE ELEMENTS: Cartographic frame
          ══════════════════════════════════════════════════════════ */}
      
      {/* Grain texture overlay */}
      <div className="grain-overlay" aria-hidden="true" />
      
      {/* Corner accents */}
      <div className="corner-accent-tl" aria-hidden="true" />
      <div className="corner-accent-br" aria-hidden="true" />
      
      {/* Coordinate markers */}
      <span className="coord-marker text-hyper-pink" style={{ top: '50%', left: '24px', transform: 'rotate(-90deg) translateX(-50%)', transformOrigin: 'left center' }}>
        51.5074° N
      </span>
      <span className="coord-marker text-hyper-teal" style={{ bottom: '24px', right: '120px' }}>
        0.1278° W
      </span>

      {/* ══════════════════════════════════════════════════════════
          HEADER: Glass navigation bar
          ══════════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-10 animate-slide-up">
        <div className="glass-strong mx-6 mt-6 rounded-2xl px-6 py-4">
          <div className="mx-auto max-w-4xl flex items-center gap-4">
            {/* Hyperfinity Logo */}
            <Image
              src="/hyperfinity_logo_dark.png"
              alt="Hyperfinity"
              width={120}
              height={40}
              className="h-5 w-auto brightness-0 invert opacity-80"
            />
            
            {/* Divider */}
            <div className="w-px h-6 bg-white/20" />
            
            {/* Globe Icon with glow */}
            <div className="relative">
              <Image
                src="/globe.svg"
                alt="Atlas"
                width={28}
                height={28}
                className="w-7 h-7"
              />
              <div className="absolute inset-0 blur-lg opacity-50">
                <Image
                  src="/globe.svg"
                  alt=""
                  width={28}
                  height={28}
                  className="w-7 h-7"
                />
              </div>
            </div>
            
            {/* Atlas title - dramatic typography */}
            <h1 className="text-gradient text-2xl font-bold tracking-tight text-glow">
              Atlas
            </h1>
            
            {/* Spacer */}
            <div className="flex-1" />
            
            {/* Status indicator */}
            <div className="flex items-center gap-2 text-xs text-white/40 uppercase tracking-widest">
              <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-hyper-pink animate-glow-pulse' : 'bg-hyper-teal'}`} />
              {isLoading ? 'Processing' : 'Ready'}
            </div>
          </div>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════
          MAIN CONTENT: Message area
          ══════════════════════════════════════════════════════════ */}
      <div className="relative flex-1">
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="absolute inset-0 overflow-y-auto touch-pan-y"
        >
          <MessageList messages={messages} isLoading={isLoading} onSendMessage={sendMessage} />
          <div ref={messagesEndRef} />
        </div>

        {/* Scroll to bottom button */}
        {!isAtBottom && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 glass-button rounded-full p-3 text-white animate-scale-in"
          >
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
            >
              <path d="M12 5v14M19 12l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════
          FOOTER: Input area with controls
          ══════════════════════════════════════════════════════════ */}
      <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <div className="glass-strong mx-6 mb-6 rounded-2xl p-5">
          <div className="mx-auto max-w-4xl">
            {/* Controls row */}
            <div className="flex items-center justify-between mb-4">
              {/* Left: Hint text */}
              <span className="text-xs text-white/30 tracking-wide">
                Press Enter to send • Shift+Enter for new line
              </span>
              
              {/* Right: Curated sources toggle */}
              <button
                onClick={() => setUseCuratedOnly(!useCuratedOnly)}
                className={`glass-button flex items-center gap-2.5 px-4 py-2 rounded-full text-xs font-medium tracking-wide uppercase transition-all duration-300 ${
                  useCuratedOnly
                    ? "!bg-hyper-teal/20 !border-hyper-teal/50"
                    : ""
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                    useCuratedOnly 
                      ? "border-hyper-teal bg-hyper-teal/30" 
                      : "border-white/40"
                  }`}
                >
                  {useCuratedOnly && (
                    <div className="w-1.5 h-1.5 rounded-full bg-hyper-teal" />
                  )}
                </div>
                <span className={useCuratedOnly ? "text-hyper-teal" : "text-white/60"}>
                  Curated sources only
                </span>
              </button>
            </div>
            
            <MessageInput onSend={sendMessage} disabled={isLoading} />
          </div>
        </div>
      </div>
    </div>
  );
}
