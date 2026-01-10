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

      // Add empty assistant message that we'll stream into
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMessageId,
          role: "assistant",
          content: "",
        },
      ]);

      // Handle streaming response
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
                // Update the assistant message with accumulated content
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: accumulatedContent }
                      : msg
                  )
                );
              } else if (data.type === "citations") {
                citations = data.citations;
                // Update with citations
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
              // Ignore JSON parse errors for incomplete chunks
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
        // Remove empty assistant message if it exists and add error
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
    <div className="flex h-dvh flex-col bg-background">
      {/* Header with Hyperfinity branding */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-md px-6 py-4">
        <div className="mx-auto max-w-3xl flex items-center gap-3">
          {/* Hyperfinity Logo */}
          <Image
            src="/hyperfinity_logo_dark.png"
            alt="Hyperfinity"
            width={120}
            height={40}
            className="dark:invert-0 h-6 w-auto"
          />
          {/* Globe Icon */}
          <Image
            src="/globe.svg"
            alt="Atlas"
            width={24}
            height={24}
            className="w-6 h-6"
          />
          {/* Atlas title - right aligned */}
          <span className="ml-auto text-2xl font-bold tracking-tight text-hyper-pink">
            Atlas
          </span>
        </div>
        {/* Gradient accent line */}
        <div
          className="absolute bottom-0 left-0 right-0 h-0.5"
          style={{
            background: 'linear-gradient(90deg, var(--hyper-pink), var(--hyper-blue), var(--hyper-teal))'
          }}
        />
      </header>

      <div className="relative flex-1">
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="absolute inset-0 overflow-y-auto touch-pan-y"
        >
          <MessageList messages={messages} isLoading={isLoading} onSendMessage={sendMessage} />
          <div ref={messagesEndRef} />
        </div>

        {!isAtBottom && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-hyper-pink text-white p-2.5 shadow-lg transition-all duration-200 hover:bg-hyper-pink-hover hover:scale-110 hover:shadow-xl active:scale-95"
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

      <div className="border-t border-border/50 bg-background p-4">
        <div className="mx-auto max-w-3xl">
          {/* Curated sources toggle */}
          <div className="flex justify-end mb-3">
            <button
              onClick={() => setUseCuratedOnly(!useCuratedOnly)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                useCuratedOnly
                  ? "bg-hyper-teal text-black"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                  useCuratedOnly ? "border-black bg-white" : "border-current"
                }`}
              >
                {useCuratedOnly && (
                  <div className="w-2 h-2 rounded-full bg-hyper-teal" />
                )}
              </div>
              Use curated sources only
            </button>
          </div>
          <MessageInput onSend={sendMessage} disabled={isLoading} />
        </div>
      </div>
    </div>
  );
}
