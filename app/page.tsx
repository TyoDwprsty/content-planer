"use client"

import { useEffect, useState, useMemo } from "react"
import { ReactFlow, ReactFlowProvider, Background, Controls, MiniMap } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useTrackerStore } from "@/store/useTrackerStore"
import { TopBar } from "@/components/TopBar"
import { InputModal } from "@/components/InputModal"
import { ContentManager } from "@/components/ContentManager"
import { Toaster } from "react-hot-toast"
import { CheckpointNode } from "@/components/NodeTypes/CheckpointNode"
import { PhaseNode } from "@/components/NodeTypes/PhaseNode"
import { DeletableEdge } from "@/components/NodeTypes/DeletableEdge"
import { Plus } from "lucide-react"

export default function Home() {
  const { 
    phases, nodes, edges, isLoading, 
    fetchData, addPhase, addCheckpoint,
    onNodesChange, onEdgesChange, updateNodePosition, onConnect
  } = useTrackerStore()

  const [isAddPhaseModalOpen, setIsAddPhaseModalOpen] = useState(false)
  const [isAddCheckpointModalOpen, setIsAddCheckpointModalOpen] = useState(false)
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(null)

  const nodeTypes = useMemo(() => ({
    checkpointNode: CheckpointNode,
    phaseNode: PhaseNode
  }), [])

  const edgeTypes = useMemo(() => ({
    deletable: DeletableEdge
  }), [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleAddPhase = (title: string) => {
    addPhase(title)
  }

  const handleAddCheckpoint = (title: string) => {
    // Default to first phase if none selected but phases exist
    const targetPhaseId = selectedPhaseId || (phases.length > 0 ? phases[0].id : null)
    if (targetPhaseId) {
      addCheckpoint(targetPhaseId, title)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
        <div className="w-8 h-8 border-4 border-zinc-300 dark:border-zinc-700 border-t-zinc-900 dark:border-t-zinc-100 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-screen w-screen bg-zinc-50 dark:bg-black flex flex-col overflow-hidden">
      <Toaster position="top-center" />
      <ContentManager />
      <TopBar />
      
      <div className="flex-1 w-full relative pt-16">
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDragStop={(_, node) => updateNodePosition(node.id, node.position)}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.1}
            proOptions={{ hideAttribution: true }}
            className="bg-zinc-50 dark:bg-black"
          >
            <Background color="#71717a" gap={24} size={2} />
            <Controls className="bg-white dark:bg-zinc-900 fill-zinc-900 dark:fill-zinc-100 border-zinc-200 dark:border-zinc-800" />
            <MiniMap 
              nodeStrokeColor={(n) => {
                if (n.type === 'phaseNode') return '#52525b'
                return '#3b82f6'
              }}
              nodeColor={(n) => {
                if (n.type === 'phaseNode') return 'transparent'
                return '#18181b'
              }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg"
            />
          </ReactFlow>
        </ReactFlowProvider>

        {/* Floating Action Menu for Graph */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-4 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md px-6 py-3 rounded-full border border-zinc-200 dark:border-zinc-800 shadow-xl">
          <button
            onClick={() => setIsAddPhaseModalOpen(true)}
            className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            <Plus size={16} /> Add Phase Node
          </button>
          
          <div className="w-px h-4 bg-zinc-300 dark:bg-zinc-700" />

          {phases.length > 0 ? (
             <div className="flex items-center gap-2">
               <select 
                 className="bg-zinc-100 dark:bg-zinc-800 text-xs rounded px-2 py-1 outline-none text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700"
                 onChange={(e) => setSelectedPhaseId(e.target.value)}
                 value={selectedPhaseId || (phases.length > 0 ? phases[0].id : "")}
               >
                 <option value="" disabled>Select Phase...</option>
                 {phases.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
               </select>
               <button
                 onClick={() => setIsAddCheckpointModalOpen(true)}
                 className="flex items-center gap-1 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
               >
                 <Plus size={16} /> Add Checkpoint Node
               </button>
             </div>
          ) : (
            <span className="text-xs text-zinc-500">Create a Phase first</span>
          )}
        </div>
      </div>
      
      <InputModal
        isOpen={isAddPhaseModalOpen}
        onClose={() => setIsAddPhaseModalOpen(false)}
        onSubmit={handleAddPhase}
        title="Add New Phase"
        placeholder="e.g. Frontend Basics"
        submitLabel="Add Phase"
      />

      <InputModal
        isOpen={isAddCheckpointModalOpen}
        onClose={() => setIsAddCheckpointModalOpen(false)}
        onSubmit={handleAddCheckpoint}
        title="Add New Checkpoint Node"
        placeholder="e.g. React Hooks"
        submitLabel="Add Node"
      />
    </div>
  )
}
