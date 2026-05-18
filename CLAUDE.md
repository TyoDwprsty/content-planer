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

### 4. Supabase Database Schema Setup
Go to your Supabase Project's **SQL Editor** and run the following script to create all necessary tables and configure RLS (Row Level Security) with access control policies:

```sql
-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create phases table
CREATE TABLE public.phases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    position_x DOUBLE PRECISION NOT NULL DEFAULT 100,
    position_y DOUBLE PRECISION NOT NULL DEFAULT 100,
    width DOUBLE PRECISION DEFAULT 400,
    height DOUBLE PRECISION DEFAULT 600,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create checkpoints table
CREATE TABLE public.checkpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phase_id UUID NOT NULL REFERENCES public.phases(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    position_x DOUBLE PRECISION NOT NULL DEFAULT 50,
    position_y DOUBLE PRECISION NOT NULL DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create tasks table
CREATE TABLE public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checkpoint_id UUID NOT NULL REFERENCES public.checkpoints(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    order_index INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create connections table
CREATE TABLE public.connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    source_checkpoint_id UUID REFERENCES public.checkpoints(id) ON DELETE CASCADE,
    source_phase_id UUID REFERENCES public.phases(id) ON DELETE CASCADE,
    target_checkpoint_id UUID REFERENCES public.checkpoints(id) ON DELETE CASCADE,
    target_phase_id UUID REFERENCES public.phases(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT check_source CHECK (
        (source_checkpoint_id IS NOT NULL AND source_phase_id IS NULL) OR
        (source_checkpoint_id IS NULL AND source_phase_id IS NOT NULL)
    ),
    CONSTRAINT check_target CHECK (
        (target_checkpoint_id IS NOT NULL AND target_phase_id IS NULL) OR
        (target_checkpoint_id IS NULL AND target_phase_id IS NOT NULL)
    )
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

-- Setup RLS Policies for authenticated users
CREATE POLICY "Users can manage their own phases" ON public.phases FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage checkpoints in their phases" ON public.checkpoints FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.phases WHERE public.phases.id = public.checkpoints.phase_id AND public.phases.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.phases WHERE public.phases.id = public.checkpoints.phase_id AND public.phases.user_id = auth.uid()));
CREATE POLICY "Users can manage tasks in their checkpoints" ON public.tasks FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.checkpoints JOIN public.phases ON public.phases.id = public.checkpoints.phase_id WHERE public.checkpoints.id = public.tasks.checkpoint_id AND public.phases.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.checkpoints JOIN public.phases ON public.phases.id = public.checkpoints.phase_id WHERE public.checkpoints.id = public.tasks.checkpoint_id AND public.phases.user_id = auth.uid()));
CREATE POLICY "Users can manage their own connections" ON public.connections FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

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
