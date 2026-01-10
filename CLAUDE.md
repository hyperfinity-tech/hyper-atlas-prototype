# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Atlas is a RAG-based Q&A service using Google Gemini File Search API. It provides a chatbot interface where users can ask questions, with answers sourced from uploaded reference documents.

## Commands

```bash
# Development
npm run dev          # Start dev server at localhost:3000
npm run build        # Production build
npm run lint         # Run ESLint

# Python upload script (one-time setup)
cd scripts
pip install -r requirements.txt
GOOGLE_API_KEY=your-key python upload_files.py /path/to/documents --store-name atlas-store
```

## Architecture

```
src/
├── app/
│   ├── api/chat/route.ts   # Chat endpoint - calls Gemini with File Search
│   ├── page.tsx            # Main page - renders Chat component
│   └── layout.tsx          # Root layout
├── components/
│   ├── Chat.tsx            # Main chat container with state management
│   ├── MessageList.tsx     # Renders messages with markdown support
│   ├── MessageInput.tsx    # Input field with send button
│   └── Citation.tsx        # Clickable citation popover
└── lib/
    ├── gemini.ts           # Gemini client configuration
    └── types.ts            # Shared TypeScript types
```

## Key Integration Points

**Gemini File Search API**: The `/api/chat` route uses `genai.models.generateContent` with `fileSearch` tool configured. Citations are extracted from `groundingMetadata.groundingChunks` in the response.

**Multi-turn Conversation**: Chat history is maintained client-side and sent with each request to provide conversation context.

## Environment Variables

Copy `.env.local.example` to `.env.local`:
- `GOOGLE_API_KEY` - Gemini API key
- `FILE_SEARCH_STORE_NAME` - Name of the File Search Store (created by upload script)
