"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, X, Send } from "lucide-react"
import { useTrackerStore } from "@/store/useTrackerStore"

export function AIPromptPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [prompt, setPrompt] = useState("")
  const { generatePlanFromAi } = useTrackerStore()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim()) return
    generatePlanFromAi(prompt)
    setPrompt("")
    setIsOpen(false)
  }

  return (
    <>
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 sm:bottom-8 right-8 z-50 p-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-full shadow-lg hover:shadow-indigo-500/50 hover:scale-105 transition-all flex items-center justify-center group"
      >
        <Sparkles size={24} className="group-hover:animate-pulse" />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-24 sm:bottom-24 right-4 sm:right-8 z-50 w-[calc(100vw-32px)] sm:w-96 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950/50">
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                <Sparkles size={16} className="text-indigo-500" />
                AI Assistant
              </div>
              <button onClick={() => setIsOpen(false)} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
                <X size={16} />
              </button>
            </div>
            
            <div className="p-4">
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
                What do you want to learn? I'll instantly generate a structured curriculum on your canvas.
              </p>

              <form onSubmit={handleSubmit} className="relative">
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. A roadmap to learn Next.js in 3 phases"
                  className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl py-3 pl-4 pr-12 text-sm outline-none text-zinc-900 dark:text-zinc-100 focus:border-indigo-500 transition-colors"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!prompt.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-600 transition-colors"
                >
                  <Send size={14} />
                </button>
              </form>
              
              <div className="flex flex-wrap gap-2 mt-4">
                {["Learn TypeScript", "SaaS Marketing Plan", "UI/UX Design Basics"].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      setPrompt(suggestion)
                      generatePlanFromAi(suggestion)
                      setIsOpen(false)
                    }}
                    className="text-[10px] px-2 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
