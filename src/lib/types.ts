export interface Citation {
  id: number;
  sourceTitle: string;
  sourceUri?: string;
  text: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
}

export interface Conversation {
  id: string;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
}
