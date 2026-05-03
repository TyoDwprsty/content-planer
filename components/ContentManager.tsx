"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Database, X, Minimize2, Maximize2, Pencil, Trash2, ChevronDown, ChevronRight } from "lucide-react"
import { useTrackerStore, type Phase, type Checkpoint } from "@/store/useTrackerStore"

export function ContentManager() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [expandedPhases, setExpandedPhases] = useState<Record<string, boolean>>({})
  const [editingItem, setEditingItem] = useState<{ id: string, type: 'phase' | 'checkpoint' | 'task', currentTitle: string } | null>(null)
  
  const { phases, updatePhase, deletePhase, updateCheckpoint, deleteCheckpoint, updateTask, deleteTask } = useTrackerStore()

  const togglePhase = (phaseId: string) => {
    setExpandedPhases(prev => ({ ...prev, [phaseId]: !prev[phaseId] }))
  }

  if (!isOpen) {
    return (
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={() => setIsOpen(true)}
        className="fixed right-8 top-1/2 -translate-y-1/2 z-50 p-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full shadow-2xl hover:scale-105 transition-transform"
      >
        <Database size={24} />
      </motion.button>
    )
  }

  const handleEditSubmit = (newTitle: string) => {
    if (!editingItem) return
    if (editingItem.type === 'phase') updatePhase(editingItem.id, newTitle)
    if (editingItem.type === 'checkpoint') updateCheckpoint(editingItem.id, newTitle)
    if (editingItem.type === 'task') updateTask(editingItem.id, newTitle)
    setEditingItem(null)
  }

  const handleDelete = (id: string, type: 'phase' | 'checkpoint' | 'task') => {
    if (confirm(`Are you sure you want to delete this ${type}?`)) {
      if (type === 'phase') deletePhase(id)
      if (type === 'checkpoint') deleteCheckpoint(id)
      if (type === 'task') deleteTask(id)
    }
  }

  return (
    <motion.div
      drag
      dragMomentum={false}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="fixed right-8 top-1/4 z-50 w-80 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      style={{ maxHeight: isMinimized ? 'auto' : '60vh' }}
    >
      {/* Header / Drag Handle */}
      <div className="p-3 bg-zinc-100 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between cursor-grab active:cursor-grabbing">
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300 pointer-events-none">
          <Database size={16} />
          Content Manager
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-zinc-500"
          >
            {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
          </button>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-500 rounded text-zinc-500"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Body */}
      <AnimatePresence>
        {!isMinimized && (
          <motion.div 
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="flex-1 overflow-y-auto custom-scrollbar p-2"
          >
            {phases.length === 0 ? (
              <p className="text-center text-xs text-zinc-500 py-8">No content yet.</p>
            ) : (
              <div className="flex flex-col gap-1">
                {phases.map(phase => (
                  <div key={phase.id} className="border border-zinc-100 dark:border-zinc-800 rounded-lg overflow-hidden">
                    {/* Phase Row */}
                    <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-950 p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors">
                      <button 
                        onClick={() => togglePhase(phase.id)}
                        className="flex items-center gap-1.5 flex-1 text-left text-sm font-semibold text-zinc-800 dark:text-zinc-200"
                      >
                        {expandedPhases[phase.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        <span className="truncate">{phase.title}</span>
                      </button>
                      <div className="flex items-center gap-1 opacity-50 hover:opacity-100">
                        <button onClick={() => setEditingItem({ id: phase.id, type: 'phase', currentTitle: phase.title })} className="p-1 hover:text-blue-500"><Pencil size={12} /></button>
                        <button onClick={() => handleDelete(phase.id, 'phase')} className="p-1 hover:text-red-500"><Trash2 size={12} /></button>
                      </div>
                    </div>
                    
                    {/* Checkpoints List */}
                    {expandedPhases[phase.id] && (
                      <div className="pl-6 pr-2 py-1 flex flex-col gap-1 bg-white dark:bg-zinc-900">
                        {phase.checkpoints.map(cp => (
                          <div key={cp.id} className="flex items-center justify-between py-1 group border-b border-dashed border-zinc-100 dark:border-zinc-800 last:border-0">
                            <span className="text-xs text-zinc-600 dark:text-zinc-400 truncate">{cp.title}</span>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => setEditingItem({ id: cp.id, type: 'checkpoint', currentTitle: cp.title })} className="p-1 text-zinc-400 hover:text-blue-500"><Pencil size={12} /></button>
                              <button onClick={() => handleDelete(cp.id, 'checkpoint')} className="p-1 text-zinc-400 hover:text-red-500"><Trash2 size={12} /></button>
                            </div>
                          </div>
                        ))}
                        {phase.checkpoints.length === 0 && (
                          <span className="text-[10px] text-zinc-400 italic py-1">No checkpoints</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Input Modal handled at page level, but we can render one here for content manager edits */}
      {editingItem && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center pointer-events-auto">
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-2xl w-80">
            <h3 className="font-semibold mb-3">Edit {editingItem.type}</h3>
            <form onSubmit={(e) => {
              e.preventDefault()
              const val = new FormData(e.currentTarget).get('title') as string
              if (val) handleEditSubmit(val)
            }}>
              <input name="title" defaultValue={editingItem.currentTitle} autoFocus className="w-full bg-zinc-100 dark:bg-zinc-800 p-2 rounded mb-3 outline-none text-zinc-900 dark:text-zinc-100" />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setEditingItem(null)} className="px-3 py-1 text-sm bg-zinc-200 dark:bg-zinc-800 rounded">Cancel</button>
                <button type="submit" className="px-3 py-1 text-sm bg-blue-500 text-white rounded">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  )
}
