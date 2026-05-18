import { Handle, Position } from '@xyflow/react'
import { useState } from "react"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { TaskItem } from "@/components/TaskItem"
import { useTrackerStore, type Task } from "@/store/useTrackerStore"

export function CheckpointNode({ data }: any) {
  const { checkpoint, phaseTitle } = data
  const { toggleTask, addTask, updateCheckpoint, deleteCheckpoint } = useTrackerStore()
  const [newTaskTitle, setNewTaskTitle] = useState("")

  const tasks: Task[] = checkpoint.tasks
  const completedTasks = tasks.filter((t) => t.is_completed).length
  const totalTasks = tasks.length
  const progressPercentage = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100)

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskTitle.trim()) return
    addTask(checkpoint.id, newTaskTitle.trim())
    setNewTaskTitle("")
  }

  const handleEdit = () => {
    const newTitle = window.prompt("Enter new checkpoint title:", checkpoint.title)
    if (newTitle && newTitle.trim() !== "") {
      updateCheckpoint(checkpoint.id, newTitle.trim())
    }
  }

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this checkpoint? All tasks inside will be lost.")) {
      deleteCheckpoint(checkpoint.id)
    }
  }

  return (
    <div className="w-80 flex-shrink-0 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg overflow-hidden flex flex-col min-h-[200px] h-auto">
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-zinc-400 dark:bg-zinc-600 border-2 border-white dark:border-zinc-900" />
      
      {/* Node Header (Blender style) */}
      <div className="p-3 bg-zinc-100 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700 flex flex-col gap-1 group/cpheader relative">
        <div className="absolute top-3 right-3 opacity-0 group-hover/cpheader:opacity-100 flex items-center gap-1 transition-opacity">
          <button onClick={handleEdit} className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-zinc-500 hover:text-blue-500 rounded"><Pencil size={12} /></button>
          <button onClick={handleDelete} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/50 text-zinc-500 hover:text-red-500 rounded"><Trash2 size={12} /></button>
        </div>
        
        <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider pr-12">
          {phaseTitle}
        </span>
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-base pr-12">
          {checkpoint.title}
        </h3>
        
        {/* Progress Bar */}
        <div className="flex items-center gap-2 mt-2">
          <div className="h-1.5 flex-1 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all duration-500 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 w-6 text-right">
            {progressPercentage}%
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar bg-zinc-50/50 dark:bg-zinc-950/50 cursor-auto nodrag nowheel">
        {tasks.map((task) => (
          <TaskItem
            key={task.id}
            id={task.id}
            title={task.title}
            isCompleted={task.is_completed}
            onToggle={toggleTask}
          />
        ))}
        {tasks.length === 0 && (
          <p className="text-center text-xs text-zinc-400 dark:text-zinc-600 mt-8">
            No tasks yet.
          </p>
        )}
      </div>

      <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 cursor-auto nodrag">
        <form onSubmit={handleAddTask} className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Add node property..."
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-zinc-900 dark:text-zinc-100 placeholder-zinc-500"
          />
          <button
            type="submit"
            disabled={!newTaskTitle.trim()}
            className="p-1.5 bg-blue-500 text-white rounded disabled:opacity-50 hover:bg-blue-600 transition-colors"
          >
            <Plus size={14} />
          </button>
        </form>
      </div>

      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-zinc-400 dark:bg-zinc-600 border-2 border-white dark:border-zinc-900" />
    </div>
  )
}
