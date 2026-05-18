# Learning Progress Tracker - Project Context

## Overview
This is a modern, interactive Single Page Application (SPA) for tracking learning progress. The app features a node-based interface inspired by 3D software geometry nodes (like Blender).

## Tech Stack
- **Framework:** Next.js (App Router)
- **Styling:** Tailwind CSS v4 (Dark/Light mode using `next-themes` with `.dark` class)
- **Animation/Canvas:** `@xyflow/react` (React Flow) for the 2D infinite canvas and node mapping.
- **State Management:** Zustand (for optimistic UI updates and React Flow nodes/edges state)
- **Backend & Auth:** Supabase (PostgreSQL, Email/Password auth)
- **Icons:** Lucide React

## Local Setup & First-Time Run

Follow these steps to set up the project on a new development device:

### 1. Prerequisites
Ensure you have the following installed:
- **Node.js** (v18.x or higher)
- **NPM** (bundled with Node.js)

### 2. Clone and Install Dependencies
```bash
# Clone the repository
git clone <repository-url>
cd content-planer

# Install packages
npm install
```

### 3. Environment Variables Setup
Copy the environment variables template and configure it:
```bash
# Create local env file
cp .env.example .env.local
```
Open [.env.local](file:///d:/Personal%20Tyo/Coding/content-planer/.env.local) and supply your actual **Supabase URL** and **Anon Key** from the Supabase Project Dashboard under *Project Settings -> API*.

### 4. Supabase Database Schema Setup (via Prisma)
This project uses **Prisma** to manage the database schema. To push the schema to your Supabase PostgreSQL database, simply run:

```bash
npx prisma db push
```

*Note: The `prisma/schema.prisma` file is already configured with all required tables, relations, and defaults. The Supabase RLS policies should be managed through the Supabase Dashboard as Prisma does not handle RLS natively.*

### 5. Running the Application Locally
Run the Next.js development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser. Register a new user account to start tracking learning phases and checkpoints on the interactive node-canvas!

---

## Key Architectural Decisions
- **React Flow Canvas:** The main dashboard (`app/page.tsx`) renders a `<ReactFlow>` canvas. The UI is a fully interactive 2D node graph.
- **Authentication:** Integrated Supabase SSR for Server-Side and Client-Side rendering. Protected routes and auth logic are implemented using Next.js Middleware (`utils/supabase/middleware.ts`), with dedicated `/login` and `/register` routes.
- **UI Components:**
  - `TopBar`: Includes theme toggle (Light/Dark via `ThemeProvider`) and Auth interactions.
  - `ContentManager`: A draggable, floating panel to manage Checkpoints, Phases, and Data through CRUD operations via Zustand and Supabase.
  - Custom Nodes: Implementations of `PhaseNode`, `CheckpointNode`, and a custom `DeletableEdge` explicitly designed for React Flow. Checkpoints contain embedded `TaskItem` checklists.
- **State Management & Data Sync:** `useTrackerStore` handles Zustand optimistic UI state updates. If a background request to Supabase fails, a `react-hot-toast` notification alerts the user.

## Agent Instructions
- **Do not leak sensitive keys.** All Supabase keys are in `.env.local` which is gitignored.
- When modifying the UI, prioritize maintaining the sleek "node-based" aesthetic. Ensure components have clear borders, subtle backgrounds, and smooth transitions.
- Use `tailwind-merge` and `clsx` for dynamic class names.
