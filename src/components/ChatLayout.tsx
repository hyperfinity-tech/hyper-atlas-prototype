"use client";

import { useState, useEffect, useCallback } from "react";
import { Sidebar } from "./Sidebar";
import { Chat } from "./Chat";
import { Conversation, Message } from "@/lib/types";

export function ChatLayout() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const response = await fetch("/api/conversations");
      if (response.ok) {
        const data = await response.json();
        setConversations(data);
      }
    } catch (error) {
      console.error("Failed to load conversations:", error);
    } finally {
      setIsLoadingConversations(false);
    }
  };

  const loadMessages = useCallback(async (conversationId: string) => {
    setIsLoadingMessages(true);
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (error) {
      console.error("Failed to load messages:", error);
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  const handleSelectConversation = useCallback(
    async (id: string) => {
      setCurrentConversationId(id);
      await loadMessages(id);
    },
    [loadMessages]
  );

  const handleNewConversation = async () => {
    try {
      const response = await fetch("/api/conversations", {
        method: "POST",
      });
      if (response.ok) {
        const newConversation = await response.json();
        setConversations((prev) => [newConversation, ...prev]);
        setCurrentConversationId(newConversation.id);
        setMessages([]);
      }
    } catch (error) {
      console.error("Failed to create conversation:", error);
    }
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      const response = await fetch(`/api/conversations/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (currentConversationId === id) {
          setCurrentConversationId(null);
          setMessages([]);
        }
      }
    } catch (error) {
      console.error("Failed to delete conversation:", error);
    }
  };

  const handleUpdateConversationTitle = useCallback((id: string, title: string) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, title, updatedAt: new Date() } : c
      )
    );
  }, []);

  const handleMessagesUpdate = useCallback((newMessages: Message[]) => {
    setMessages(newMessages);
  }, []);

  return (
    <div className="flex h-dvh">
      <Sidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
        isLoading={isLoadingConversations}
      />
      <main className="flex-1 relative">
        <Chat
          conversationId={currentConversationId}
          messages={messages}
          onMessagesUpdate={handleMessagesUpdate}
          onUpdateTitle={handleUpdateConversationTitle}
          isLoadingMessages={isLoadingMessages}
          onStartNewConversation={handleNewConversation}
        />
      </main>
    </div>
  );
}
