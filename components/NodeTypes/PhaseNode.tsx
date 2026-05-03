import { NodeResizer, Handle, Position } from '@xyflow/react'
import { Pencil, Trash2 } from 'lucide-react'
import { useTrackerStore } from '@/store/useTrackerStore'

export function PhaseNode({ id, data, selected }: any) {
  const { updatePhase, deletePhase } = useTrackerStore()
  const dbId = id.replace('phase-', '')

  const handleEdit = () => {
    const newTitle = window.prompt("Enter new phase title:", data.title)
    if (newTitle && newTitle.trim() !== "") {
      updatePhase(dbId, newTitle.trim())
    }
  }

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this phase? All checkpoints inside will be lost.")) {
      deletePhase(dbId)
    }
  }

  return (
    <>
      <NodeResizer color="#3b82f6" isVisible={selected} minWidth={300} minHeight={400} />
      <div 
        className="backdrop-blur-xl bg-white/30 dark:bg-zinc-900/40 border border-white/50 dark:border-white/10 rounded-3xl pointer-events-none p-6 w-full h-full relative shadow-xl"
      >
        <Handle type="target" position={Position.Left} className="w-4 h-4 bg-zinc-400 dark:bg-zinc-600 border-2 border-white dark:border-zinc-900 pointer-events-auto" />
        
        <div className="phase-drag-handle pointer-events-auto cursor-grab active:cursor-grabbing w-full group/header flex items-center justify-between">
          <h2 className="text-4xl font-black text-zinc-300 dark:text-zinc-700 uppercase tracking-tighter">
            {data.title}
          </h2>
          <div className="opacity-0 group-hover/header:opacity-100 flex items-center gap-2 transition-opacity">
            <button onClick={handleEdit} className="p-2 bg-white/50 dark:bg-black/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-zinc-500 hover:text-blue-500 rounded-lg shadow-sm pointer-events-auto transition-colors"><Pencil size={16} /></button>
            <button onClick={handleDelete} className="p-2 bg-white/50 dark:bg-black/50 hover:bg-red-100 dark:hover:bg-red-900/50 text-zinc-500 hover:text-red-500 rounded-lg shadow-sm pointer-events-auto transition-colors"><Trash2 size={16} /></button>
          </div>
        </div>

        <Handle type="source" position={Position.Right} className="w-4 h-4 bg-zinc-400 dark:bg-zinc-600 border-2 border-white dark:border-zinc-900 pointer-events-auto" />
      </div>
    </>
  )
}
