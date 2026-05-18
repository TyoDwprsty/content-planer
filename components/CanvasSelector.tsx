"use client"

import { useState, useRef, useEffect } from "react"
import { useTrackerStore } from "@/store/useTrackerStore"
import { Plus, Trash2, ChevronDown } from "lucide-react"
import { InputModal } from "@/components/InputModal"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

export function CanvasSelector() {
  const [isCreateCanvasOpen, setIsCreateCanvasOpen] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  const { canvases, activeCanvasId, setActiveCanvas, clearCanvas, createCanvas } = useTrackerStore()

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  if (canvases.length === 0) return null
  
  const activeCanvas = canvases.find(c => c.id === activeCanvasId) || canvases[0]

  return (
    <>
    <div className="absolute top-20 left-6 z-40 flex items-center gap-2">
      <div 
        ref={dropdownRef}
        className="relative bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl"
      >
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="flex flex-col items-start px-4 py-2 w-48 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-2xl transition-colors"
        >
          <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-0.5">Active Canvas</span>
          <div className="flex items-center justify-between w-full">
            <span className="text-zinc-900 dark:text-zinc-100 font-medium text-sm truncate">
              {activeCanvas?.title || "Select Canvas"}
            </span>
            <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown size={14} className="text-zinc-500" />
            </motion.div>
          </div>
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute top-full left-0 mt-2 w-48 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden py-1 z-50"
            >
              <div className="max-h-60 overflow-y-auto">
                {canvases.map(c => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setActiveCanvas(c.id)
                      setIsOpen(false)
                    }}
                    className={cn(
                      "w-full text-left px-4 py-2 text-sm transition-colors flex items-center gap-2",
                      c.id === activeCanvasId 
                        ? "bg-indigo-50/80 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-medium" 
                        : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    )}
                  >
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      c.id === activeCanvasId ? "bg-indigo-500" : "bg-transparent"
                    )} />
                    <span className="truncate">{c.title}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-1 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md px-2 py-1 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl h-[52px]">

      <button 
        onClick={() => setIsCreateCanvasOpen(true)}
        className="p-2 text-zinc-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-xl transition-colors"
        title="New Canvas"
      >
        <Plus size={18} />
      </button>

      <button 
        onClick={() => {
           if (window.confirm("Are you sure you want to clear this Canvas? This action can't be undone.")) {
             clearCanvas()
           }
        }}
        className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors"
        title="Clear Canvas"
      >
        <Trash2 size={18} />
      </button>
    </div>
    </div>
    
      <InputModal
        isOpen={isCreateCanvasOpen}
        onClose={() => setIsCreateCanvasOpen(false)}
        onSubmit={createCanvas}
        title="New Canvas"
        placeholder="e.g. Frontend Roadmap"
        submitLabel="Create"
      />
    </>
  )
}
