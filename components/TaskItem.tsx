"use client"

import { Check, Pencil, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTrackerStore } from "@/store/useTrackerStore"

type TaskItemProps = {
  id: string
  title: string
  isCompleted: boolean
  onToggle: (id: string, currentStatus: boolean) => void
}

export function TaskItem({ id, title, isCompleted, onToggle }: TaskItemProps) {
  const { updateTask, deleteTask } = useTrackerStore()

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    const newTitle = window.prompt("Edit task title:", title)
    if (newTitle && newTitle.trim() !== "") {
      updateTask(id, newTitle.trim())
    }
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (window.confirm("Delete this task?")) {
      deleteTask(id)
    }
  }

  return (
    <div 
      onClick={() => onToggle(id, isCompleted)}
      className={cn(
        "group relative flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-200 overflow-hidden",
        isCompleted 
          ? "bg-zinc-100/50 border-zinc-200/50 dark:bg-zinc-900/50 dark:border-zinc-800/50" 
          : "bg-white border-zinc-200 hover:border-zinc-300 dark:bg-zinc-950 dark:border-zinc-800 dark:hover:border-zinc-700 shadow-sm"
      )}
    >
      <div 
        className={cn(
          "w-5 h-5 flex-shrink-0 rounded flex items-center justify-center transition-colors",
          isCompleted 
            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black" 
            : "border border-zinc-300 dark:border-zinc-700 group-hover:border-zinc-400 dark:group-hover:border-zinc-500"
        )}
      >
        {isCompleted && <Check size={14} strokeWidth={3} />}
      </div>
      <span 
        className={cn(
          "text-sm font-medium transition-colors flex-1 pr-10 break-words whitespace-pre-wrap",
          isCompleted 
            ? "text-zinc-400 dark:text-zinc-600 line-through" 
            : "text-zinc-700 dark:text-zinc-300"
        )}
        title={title}
      >
        {title}
      </span>
      
      <div className="absolute right-2 opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
        <button onClick={handleEdit} className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-zinc-400 hover:text-blue-500 rounded transition-colors"><Pencil size={14} /></button>
        <button onClick={handleDelete} className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/50 text-zinc-400 hover:text-red-500 rounded transition-colors"><Trash2 size={14} /></button>
      </div>
    </div>
  )
}
