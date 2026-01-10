"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Message } from "@/lib/types";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
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

      const data = await response.json();

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.content,
        citations: data.citations,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-dvh flex-col bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-sm px-4 py-3">
        <h1 className="text-lg font-semibold">Atlas</h1>
      </header>

      <div className="relative flex-1">
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="absolute inset-0 overflow-y-auto touch-pan-y"
        >
          <MessageList messages={messages} isLoading={isLoading} />
          <div ref={messagesEndRef} />
        </div>

        {!isAtBottom && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-background border shadow-md p-2 transition-all hover:bg-muted"
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

      <div className="border-t bg-background p-4">
        <div className="mx-auto max-w-3xl">
          <MessageInput onSend={sendMessage} disabled={isLoading} />
        </div>
      </div>
    </div>
  );
}
