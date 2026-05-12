# collabdocs

A real-time collaborative note-taking application built with React, Node.js, Supabase, and Yjs.

## Features

- **Document management** with soft delete and restore from trash
- **Rich text editing** with Tiptap — headings, bullet lists, code blocks, slash commands (`/heading`, `/code`, etc.)
- **Real-time collaboration** via Yjs CRDTs + Hocuspocus WebSocket server
- **Presence indicators** showing live collaborators with colored avatars
- **Debounced autosave** — content persists without excessive writes
- **Document version history** with restore to any previous version
- **User-specific workspaces** — isolated per user via Supabase Auth

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Styling | TailwindCSS |
| Editor | Tiptap + ProseMirror |
| Real-time Sync | Yjs (CRDT) + Hocuspocus WebSocket |
| Backend | Node.js + TypeScript + Express |
| Database/Auth | Supabase (PostgreSQL + GoTrue) |
| Containerization | Docker + Docker Compose |

## Architecture Overview

The application is structured in three layers:

1. **Frontend SPA** (React + Vite, port 5173) — communicates with the Express REST API for document CRUD operations. The Tiptap editor uses `HocuspocusProvider` to connect to the Hocuspocus WebSocket server for real-time Yjs sync.

2. **Backend** (Node.js + Express, port 3001 + Hocuspocus port 1234) — Express handles REST API routes (auth, documents, versions). Hocuspocus runs as a separate HTTP server in the same process, handling WebSocket connections, document load/store, and awareness broadcasts.

3. **Supabase** — handles authentication (GoTrue), PostgreSQL storage for documents/versions, and RLS policies for user isolation.

## Prerequisites

**Docker Desktop only.** No Node.js, no npm, nothing else required locally.

## Getting Started

1. Clone the repository:
   ```bash
   git clone <repo-url>
   cd collabdocs
   ```

2. Create a Supabase project at https://supabase.com:
   - Go to **SQL Editor** and run the contents of `supabase/schema.sql`
   - Copy your **Project URL**, **Anon Key**, **Service Role Key**, and **JWT Secret**

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```

4. Start the full stack:
   ```bash
   docker compose up --build
   ```

5. Open the app at **http://localhost:5173**

## Architecture Decisions

### CRDT Approach — Why Yjs

Chose Yjs over Operational Transformation because:
- **No server-side transform logic** — conflicts resolve automatically at the data structure level
- **Network partition tolerant** — users can edit offline, changes merge on reconnect
- **First-class Tiptap integration** via `y-prosemirror` — Collaboration and CollaborationCursor extensions handle all the wiring
- **Horizontal scalability** — Hocuspocus supports a Redis adapter for multi-instance deployments

**Tradeoff:** Binary `ydoc_state` must be persisted to Supabase (as BYTEA) to survive server restarts. The initial payload is slightly larger than delta-based OT, but the complexity savings are substantial.

### Why Hocuspocus over Raw WebSocket

Hocuspocus implements the full Yjs WebSocket protocol with:
- Authentication hooks (`onAuthenticate`)
- Document lifecycle (`onLoadDocument`, `onStoreDocument`)
- Awareness broadcasting (presence indicators)
- Redis adapter support for horizontal scaling

Rolling a raw `ws` server would re-implement the same protocol at higher risk.

### Two-Layer Autosave Strategy

1. **Hocuspocus `onChange`** (3s server-side debounce): persists `ydoc_state` (binary) + Tiptap JSON to `documents` table and triggers version snapshots. This is the source of truth for collaborative state.
2. **Frontend title debounce** (1.5s): title changes go directly to the REST API, independent of content sync.

Content survives WebSocket disconnections because `ydoc_state` is persisted and reloaded on the next `onLoadDocument`.

### Soft Delete Design

`is_deleted` flag + `deleted_at` timestamp, each indexed separately. No data loss — the trash panel queries the soft-deleted set. Hard delete is not exposed in the UI.

### Version Snapshot Deduplication

`createSnapshot` compares `JSON.stringify` of new vs last content — skips write if identical. `version_num` is sequential per document. Restoring creates a new snapshot rather than mutating history, preserving auditability.

## Deployment

**Frontend → Vercel:**
- Connect GitHub repository
- Set build command: `cd frontend && npm run build`
- Set output directory: `frontend/dist`
- Add all `VITE_` environment variables

**Backend → Railway or Fly.io:**
- Deploy from `backend/Dockerfile` (production target)
- Set all non-`VITE_` environment variables
- Expose ports 3001 (REST) and 1234 (WebSocket)

## What I Would Build Next (Given More Time)

1. **Offline support** — `y-indexeddb` provider to buffer local edits when disconnected, sync queue on reconnect
2. **Document sharing** — token-based read-only or editable shareable links
3. **Redis adapter** for Hocuspocus — enables horizontal scaling across multiple backend instances
4. **Real-time activity feed** — Supabase Realtime subscriptions on `document_versions` to show recent edits
5. **Full-text search** — `pg_trgm` or `pgvector` for semantic document search
6. **Nested document hierarchy** — `parent_id` on `documents` table for Notion-style nested pages

## AI Tool Usage

This project was built using **Claude Code** (claude-sonnet-4-6) as the primary coding assistant.

**Where AI was helpful:**
- Scaffolding boilerplate (Dockerfiles, tsconfig, package.json) at speed
- Generating type-safe TypeScript interfaces consistent with the database schema
- Writing the Hocuspocus hook implementations (`onLoadDocument`, `onStoreDocument`, `onChange`)
- SlashCommands extension with tippy.js rendering — the Tiptap Suggestion API has a lot of moving parts

**Where AI fell short:**
- Initial Hocuspocus `onStoreDocument` used incorrect binary encoding — required manual fix to use `Y.encodeStateAsUpdate` correctly
- The `CollaborationCursor` provider reference timing (provider initialized in useEffect, but useEditor runs synchronously) required restructuring the Editor component
- TypeScript strict mode surfaced several implicit `any` types in suggestion render callbacks that needed explicit typing

**Decisions where AI output was overridden:**
- AI initially proposed using `useEffect` for provider initialization inside `useEditor` options — overridden to use `useRef` + separate `useEffect` to avoid stale closures
- AI suggested `window.localStorage` for token caching — overridden to always use Supabase session directly to avoid stale tokens
- Version restore initially mutated the existing snapshot row — overridden to always insert a new snapshot to preserve history integrity
