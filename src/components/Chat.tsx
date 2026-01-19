"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { Message, Citation } from "@/lib/types";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";

interface ChatProps {
  conversationId: string | null;
  messages: Message[];
  onMessagesUpdate: (messages: Message[]) => void;
  onUpdateTitle: (id: string, title: string) => void;
  isLoadingMessages: boolean;
  onStartNewConversation: () => void;
}

export function Chat({
  conversationId,
  messages,
  onMessagesUpdate,
  onUpdateTitle,
  isLoadingMessages,
  onStartNewConversation,
}: ChatProps) {
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
    // If no conversation selected, create one first
    if (!conversationId) {
      onStartNewConversation();
      return;
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content,
    };

    const assistantMessageId = crypto.randomUUID();

    onMessagesUpdate([...messages, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          history: messages,
          conversationId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      onMessagesUpdate([
        ...messages,
        userMessage,
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
                onMessagesUpdate([
                  ...messages,
                  userMessage,
                  {
                    id: assistantMessageId,
                    role: "assistant",
                    content: accumulatedContent,
                    citations,
                  },
                ]);
              } else if (data.type === "citations") {
                citations = data.citations;
                onMessagesUpdate([
                  ...messages,
                  userMessage,
                  {
                    id: assistantMessageId,
                    role: "assistant",
                    content: accumulatedContent,
                    citations,
                  },
                ]);
              } else if (data.type === "title" && conversationId) {
                onUpdateTitle(conversationId, data.title);
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
      onMessagesUpdate([
        ...messages.filter(
          (msg) => !(msg.role === "assistant" && msg.content === "")
        ),
        userMessage,
        errorMessage,
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Show welcome screen if no conversation selected
  if (!conversationId && !isLoadingMessages) {
    return (
      <div className="flex h-dvh flex-col relative">
        {/* Decorative elements */}
        <div className="grain-overlay" aria-hidden="true" />
        <div className="corner-accent-tl" aria-hidden="true" />
        <div className="corner-accent-br" aria-hidden="true" />
        <span
          className="coord-marker text-hyper-pink"
          style={{
            top: "50%",
            left: "24px",
            transform: "rotate(-90deg) translateX(-50%)",
            transformOrigin: "left center",
          }}
        >
          51.5074 N
        </span>
        <span
          className="coord-marker text-hyper-teal"
          style={{ bottom: "24px", right: "120px" }}
        >
          0.1278 W
        </span>

        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md px-6 animate-fade-in">
            <div className="relative mx-auto w-20 h-20 mb-6">
              <Image
                src="/globe.svg"
                alt="Atlas"
                width={80}
                height={80}
                className="w-full h-full"
              />
              <div className="absolute inset-0 blur-2xl opacity-50">
                <Image
                  src="/globe.svg"
                  alt=""
                  width={80}
                  height={80}
                  className="w-full h-full"
                />
              </div>
            </div>
            <h1 className="text-gradient text-4xl font-bold tracking-tight text-glow mb-4">
              Atlas
            </h1>
            <p className="text-white/50 mb-8">
              Your AI-powered knowledge navigator. Start a new conversation to
              explore.
            </p>
            <button
              onClick={onStartNewConversation}
              className="btn-glow text-white rounded-xl px-6 py-3 font-medium tracking-wide text-sm inline-flex items-center gap-2"
            >
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
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              Start New Conversation
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col relative">
      {/* Decorative elements */}
      <div className="grain-overlay" aria-hidden="true" />
      <div className="corner-accent-tl" aria-hidden="true" />
      <div className="corner-accent-br" aria-hidden="true" />
      <span
        className="coord-marker text-hyper-pink"
        style={{
          top: "50%",
          left: "24px",
          transform: "rotate(-90deg) translateX(-50%)",
          transformOrigin: "left center",
        }}
      >
        51.5074 N
      </span>
      <span
        className="coord-marker text-hyper-teal"
        style={{ bottom: "24px", right: "120px" }}
      >
        0.1278 W
      </span>

      {/* Header */}
      <header className="sticky top-0 z-10 animate-slide-up">
        <div className="glass-strong mx-6 mt-6 rounded-2xl px-6 py-4">
          <div className="mx-auto max-w-4xl flex items-center gap-4">
            <Image
              src="/hyperfinity_logo_dark.png"
              alt="Hyperfinity"
              width={120}
              height={40}
              className="h-5 w-auto brightness-0 invert opacity-80"
            />
            <div className="w-px h-6 bg-white/20" />
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
            <h1 className="text-gradient text-2xl font-bold tracking-tight text-glow">
              Atlas
            </h1>
            <div className="flex-1" />
            <div className="flex items-center gap-2 text-xs text-white/40 uppercase tracking-widest">
              <div
                className={`w-2 h-2 rounded-full ${
                  isLoading || isLoadingMessages
                    ? "bg-hyper-pink animate-glow-pulse"
                    : "bg-hyper-teal"
                }`}
              />
              {isLoadingMessages
                ? "Loading"
                : isLoading
                  ? "Processing"
                  : "Ready"}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="relative flex-1">
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="absolute inset-0 overflow-y-auto touch-pan-y"
        >
          <MessageList
            messages={messages}
            isLoading={isLoading || isLoadingMessages}
            onSendMessage={sendMessage}
          />
          <div ref={messagesEndRef} />
        </div>

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

      {/* Footer */}
      <div className="animate-slide-up" style={{ animationDelay: "0.1s" }}>
        <div className="glass-strong mx-6 mb-6 rounded-2xl p-5">
          <div className="mx-auto max-w-4xl">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-white/30 tracking-wide">
                Press Enter to send
              </span>
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
                <span
                  className={useCuratedOnly ? "text-hyper-teal" : "text-white/60"}
                >
                  Curated sources only
                </span>
              </button>
            </div>
            <MessageInput
              onSend={sendMessage}
              disabled={isLoading || isLoadingMessages || !conversationId}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
