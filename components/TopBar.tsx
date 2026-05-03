"use client"

import { useTheme } from "next-themes"
import { Moon, Sun, User, LogOut, Settings } from "lucide-react"
import { useState, useEffect } from "react"
import { logout } from "@/app/login/actions"
import { createClient } from "@/utils/supabase/client"
import { InputModal } from "@/components/InputModal"

export function TopBar() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [userEmail, setUserEmail] = useState("")
  const [userName, setUserName] = useState("")
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
    const fetchUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserEmail(user.email || "")
        setUserName(user.user_metadata?.full_name || "User")
      }
    }
    fetchUser()
  }, [])

  const handleUpdateName = async (newName: string) => {
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({
      data: { full_name: newName }
    })
    if (!error) {
      setUserName(newName)
    } else {
      console.error(error)
      alert("Failed to update name")
    }
  }

  if (!mounted) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 backdrop-blur-md bg-white/70 dark:bg-black/70 border-b border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-semibold tracking-tight">
        <div className="w-8 h-8 bg-zinc-900 dark:bg-zinc-100 rounded-lg flex items-center justify-center">
           <span className="text-white dark:text-black font-black text-xl leading-none">L</span>
        </div>
        LearnFlow
      </div>

      <div className="flex items-center gap-4 relative">
        <button
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          className="p-2 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shadow-sm"
        >
          {resolvedTheme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <button 
          onClick={() => setProfileOpen(!profileOpen)}
          className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center hover:ring-2 ring-zinc-400 dark:ring-zinc-600 transition-all"
        >
          <User size={20} className="text-zinc-700 dark:text-zinc-300" />
        </button>

        {profileOpen && (
          <div className="absolute top-14 right-0 w-64 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg py-2 overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{userName}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{userEmail}</p>
            </div>
            
            <button 
              onClick={() => {
                setProfileOpen(false)
                setIsEditProfileOpen(true)
              }}
              className="w-full px-4 py-2 text-left text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center gap-2"
            >
              <Settings size={16} />
              Edit Profile
            </button>
            <form action={logout} className="w-full">
               <button 
                  type="submit"
                  className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2"
                >
                  <LogOut size={16} />
                  Sign out
                </button>
            </form>
          </div>
        )}
      </div>

      <InputModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        onSubmit={handleUpdateName}
        title="Edit Profile"
        placeholder={userName || "Your Name"}
        submitLabel="Save Changes"
      />
    </div>
  )
}
