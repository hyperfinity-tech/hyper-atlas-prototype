"use client";

import { UserButton } from "@clerk/nextjs";
import { Conversation } from "@/lib/types";

interface SidebarProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  isLoading: boolean;
}

export function Sidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  isLoading,
}: SidebarProps) {
  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return new Date(date).toLocaleDateString();
  };

  return (
    <aside className="w-72 h-dvh flex flex-col border-r border-white/10 bg-black/20">
      {/* Header */}
      <div className="p-4">
        <button
          onClick={onNewConversation}
          disabled={isLoading}
          className="w-full btn-glow text-white rounded-xl px-4 py-3 font-medium tracking-wide text-sm flex items-center justify-center gap-2 disabled:opacity-50"
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
          New Chat
        </button>
      </div>

      {/* Conversations list */}
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {conversations.length === 0 ? (
          <div className="text-center text-white/30 text-sm py-8 px-4">
            No conversations yet. Start a new chat!
          </div>
        ) : (
          <div className="space-y-1">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`group relative rounded-lg transition-all duration-200 ${
                  currentConversationId === conversation.id
                    ? "bg-white/10 border border-hyper-teal/30"
                    : "hover:bg-white/5 border border-transparent"
                }`}
              >
                <button
                  onClick={() => onSelectConversation(conversation.id)}
                  className="w-full text-left p-3 pr-10"
                >
                  <div className="flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={`flex-shrink-0 ${
                        currentConversationId === conversation.id
                          ? "text-hyper-teal"
                          : "text-white/40"
                      }`}
                    >
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    <span
                      className={`text-sm truncate ${
                        currentConversationId === conversation.id
                          ? "text-white"
                          : "text-white/70"
                      }`}
                    >
                      {conversation.title || "New conversation"}
                    </span>
                  </div>
                  <span className="text-xs text-white/30 mt-1 block pl-5">
                    {formatDate(conversation.updatedAt)}
                  </span>
                </button>

                {/* Delete button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteConversation(conversation.id);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-white/10 transition-all text-white/40 hover:text-hyper-pink"
                  title="Delete conversation"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* User section */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3">
          <UserButton
            appearance={{
              elements: {
                avatarBox: "w-9 h-9",
              },
            }}
          />
          <span className="text-sm text-white/60 truncate">Your Account</span>
        </div>
      </div>
    </aside>
  );
}
