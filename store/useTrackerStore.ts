import { create } from 'zustand'
import { createClient } from '@/utils/supabase/client'
import { Node, Edge, applyNodeChanges, applyEdgeChanges, NodeChange, EdgeChange } from '@xyflow/react'
import { toast } from 'react-hot-toast'

export type Task = {
  id: string
  checkpoint_id: string
  title: string
  is_completed: boolean
  order_index: number
}

export type Checkpoint = {
  id: string
  phase_id: string
  title: string
  order_index: number
  position_x: number
  position_y: number
  tasks: Task[]
}

export type Phase = {
  id: string
  user_id: string
  title: string
  order_index: number
  position_x: number
  position_y: number
  width: number
  height: number
  checkpoints: Checkpoint[]
}

type TrackerState = {
  phases: Phase[]
  nodes: Node[]
  edges: Edge[]
  isLoading: boolean
  
  // React Flow handlers
  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: any) => Promise<void>
  
  // Data fetch & mutators
  fetchData: () => Promise<void>
  toggleTask: (taskId: string, currentStatus: boolean) => Promise<void>
  addTask: (checkpointId: string, title: string) => Promise<void>
  addPhase: (title: string) => Promise<void>
  addCheckpoint: (phaseId: string, title: string) => Promise<void>
  updateNodePosition: (nodeId: string, position: { x: number, y: number }) => Promise<void>
  updatePhaseSize: (phaseId: string, dimensions: { width: number, height: number }) => Promise<void>
  
  updatePhase: (phaseId: string, title: string) => Promise<void>
  deletePhase: (phaseId: string) => Promise<void>
  updateCheckpoint: (checkpointId: string, title: string) => Promise<void>
  deleteCheckpoint: (checkpointId: string) => Promise<void>
  updateTask: (taskId: string, title: string) => Promise<void>
  deleteTask: (taskId: string) => Promise<void>
  
  deleteConnection: (dbId: string, edgeId: string) => Promise<void>
}

// Helper to calculate layout positions based on order
const generateFlowElements = (phases: Phase[]) => {
  const nodes: Node[] = []
  
  let defaultX = 100
  let defaultY = 100

  phases.forEach((phase) => {
    const phaseNodeId = `phase-${phase.id}`
    
    // Calculate bounding box if no saved width/height exists
    let maxX = phase.width || 400
    let maxY = phase.height || 600
    
    if (!phase.width) {
      phase.checkpoints.forEach((cp) => {
        const cpX = cp.position_x || 50
        const cpY = cp.position_y || 50
        if (cpX + 350 > maxX) maxX = cpX + 350
        if (cpY + 550 > maxY) maxY = cpY + 550
      })
    }

    nodes.push({
      id: phaseNodeId,
      type: 'phaseNode',
      position: { x: phase.position_x || defaultX, y: phase.position_y || defaultY },
      data: { title: phase.title },
      style: { zIndex: -1, width: maxX, height: maxY },
      dragHandle: '.phase-drag-handle' // Only drag from title
    })

    phase.checkpoints.forEach((cp, cpIndex) => {
      const nodeId = `checkpoint-${cp.id}`
      
      nodes.push({
        id: nodeId,
        type: 'checkpointNode',
        position: { x: cp.position_x || (cpIndex * 400 + 50), y: cp.position_y || 100 },
        parentId: phaseNodeId,
        extent: 'parent', // Keep inside phase
        data: { 
          checkpoint: cp,
          phaseId: phase.id,
          phaseTitle: phase.title
        },
      })
    })
    
    defaultX += maxX + 100
  })

  return { nodes, edges: [] }
}

export const useTrackerStore = create<TrackerState>((set, get) => ({
  phases: [],
  nodes: [],
  edges: [],
  isLoading: true,
  
  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    })
    
    // Intercept resize changes to persist them
    changes.forEach((change) => {
      if (change.type === 'dimensions' && change.id.startsWith('phase-') && change.resizing) {
         if (change.dimensions) {
           const dbId = change.id.replace('phase-', '')
           get().updatePhaseSize(dbId, { width: change.dimensions.width, height: change.dimensions.height })
         }
      }
    })
  },
  
  onEdgesChange: async (changes) => {
    const edgesToDelete = changes.filter(c => c.type === 'remove')
    
    // Find actual edges before they are removed from state
    const actualEdgesToDelete = edgesToDelete.map(edge => get().edges.find(e => e.id === edge.id)).filter(Boolean)
    
    set({
      edges: applyEdgeChanges(changes, get().edges),
    })

    if (actualEdgesToDelete.length > 0) {
      const supabase = createClient()
      for (const actualEdge of actualEdgesToDelete) {
        if (actualEdge && actualEdge.data?.dbId) {
           await supabase.from('connections').delete().eq('id', actualEdge.data.dbId)
        }
      }
    }
  },
  
  fetchData: async () => {
    const supabase = createClient()
    set({ isLoading: true })
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Fetch phases
    const { data: phasesData, error: phasesError } = await supabase
      .from('phases')
      .select('*')
      .eq('user_id', user.id)
      .order('order_index')

    if (phasesError) {
        toast.error(`Database Error: ${phasesError.message}. Make sure you created the tables!`)
        set({ phases: [], nodes: [], edges: [], isLoading: false })
        return
    }
    if (!phasesData || phasesData.length === 0) {
        set({ phases: [], nodes: [], edges: [], isLoading: false })
        return
    }

    // Fetch checkpoints
    const { data: checkpointsData, error: cpError } = await supabase
      .from('checkpoints')
      .select('*')
      .in('phase_id', phasesData.map((p: any) => p.id))
      .order('order_index')

    // Fetch tasks
    const { data: tasksData, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .in('checkpoint_id', (checkpointsData || []).map((c: any) => c.id))
      .order('order_index')

    // Fetch connections
    const { data: connectionsData, error: connError } = await supabase
      .from('connections')
      .select('*')
      .eq('user_id', user.id)

    if (cpError || taskError) {
       toast.error(`Database Error fetching details. Check console.`)
       console.error({cpError, taskError})
    }

    // Assemble the nested structure
    const assembledPhases = phasesData.map((phase: any) => ({
      ...phase,
      checkpoints: (checkpointsData || [])
        .filter((c: any) => c.phase_id === phase.id)
        .map((checkpoint: any) => ({
          ...checkpoint,
          tasks: (tasksData || []).filter((t: any) => t.checkpoint_id === checkpoint.id)
        }))
    }))

    const { nodes } = generateFlowElements(assembledPhases)
    
    const mappedEdges = (connectionsData || []).map((conn: any) => {
      let sourceId = ''
      let targetId = ''
      if (conn.source_checkpoint_id) sourceId = `checkpoint-${conn.source_checkpoint_id}`
      if (conn.source_phase_id) sourceId = `phase-${conn.source_phase_id}`
      if (conn.target_checkpoint_id) targetId = `checkpoint-${conn.target_checkpoint_id}`
      if (conn.target_phase_id) targetId = `phase-${conn.target_phase_id}`

      return {
        id: `conn-${conn.id}`,
        source: sourceId,
        target: targetId,
        type: 'deletable',
        animated: true,
        data: { 
          dbId: conn.id,
          isPhaseConnection: conn.source_phase_id || conn.target_phase_id
        }
      }
    })
    
    set({ phases: assembledPhases, nodes, edges: mappedEdges, isLoading: false })
  },

  toggleTask: async (taskId, currentStatus) => {
    // Optimistic update
    const newStatus = !currentStatus
    const originalPhases = get().phases
    const originalNodes = get().nodes
    
    const newPhases = originalPhases.map(phase => ({
      ...phase,
      checkpoints: phase.checkpoints.map(cp => ({
        ...cp,
        tasks: cp.tasks.map(t => 
          t.id === taskId ? { ...t, is_completed: newStatus } : t
        )
      }))
    }))
    
    // Update nodes as well
    const { nodes, edges } = generateFlowElements(newPhases)
    // Merge new data but keep positions from current nodes
    const mergedNodes = nodes.map(n => {
       const existing = originalNodes.find(ex => ex.id === n.id)
       return existing ? { ...n, position: existing.position } : n
    })
    
    set({ phases: newPhases, nodes: mergedNodes })

    const supabase = createClient()
    const { error } = await supabase
      .from('tasks')
      .update({ is_completed: newStatus })
      .eq('id', taskId)

    if (error) {
      toast.error(`Failed to update task: ${error.message}`)
      set({ phases: originalPhases, nodes: originalNodes })
    }
  },

  addTask: async (checkpointId, title) => {
    const supabase = createClient()
    
    const phase = get().phases.find(p => p.checkpoints.some(c => c.id === checkpointId))
    const checkpoint = phase?.checkpoints.find(c => c.id === checkpointId)
    const maxOrder = checkpoint?.tasks.reduce((max, t) => Math.max(max, t.order_index), 0) || 0

    const newTask = {
      checkpoint_id: checkpointId,
      title,
      is_completed: false,
      order_index: maxOrder + 1
    }

    const toastId = toast.loading('Adding task...')
    const { data, error } = await supabase
      .from('tasks')
      .insert(newTask)
      .select()
      .single()

    if (!error && data) {
      toast.success('Task added!', { id: toastId })
      const newPhases = get().phases.map(phase => ({
        ...phase,
        checkpoints: phase.checkpoints.map(cp => {
          if (cp.id === checkpointId) {
            return { ...cp, tasks: [...cp.tasks, data as Task] }
          }
          return cp
        })
      }))
      
      const { nodes, edges } = generateFlowElements(newPhases)
      const mergedNodes = nodes.map(n => {
         const existing = get().nodes.find(ex => ex.id === n.id)
         return existing ? { ...n, position: existing.position } : n
      })
      set({ phases: newPhases, nodes: mergedNodes })
    } else {
      toast.error(`Error: ${error?.message || "Unknown error"}`, { id: toastId })
    }
  },
  
  addPhase: async (title) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const maxOrder = get().phases.reduce((max, p) => Math.max(max, p.order_index), 0) || 0

    const toastId = toast.loading('Creating Phase...')
    const { data, error } = await supabase
      .from('phases')
      .insert({ title, user_id: user.id, order_index: maxOrder + 1 })
      .select()
      .single()

    if (!error && data) {
      toast.success('Phase created!', { id: toastId })
      const newPhases = [...get().phases, { ...data, checkpoints: [] } as Phase]
      const { nodes, edges } = generateFlowElements(newPhases)
      const mergedNodes = nodes.map(n => {
         const existing = get().nodes.find(ex => ex.id === n.id)
         return existing ? { ...n, position: existing.position } : n
      })
      set({ phases: newPhases, nodes: mergedNodes, edges })
    } else {
      toast.error(`Database Error: ${error?.message || "Unknown error"}. Missing tables?`, { id: toastId })
    }
  },

  addCheckpoint: async (phaseId, title) => {
    const supabase = createClient()
    
    const phase = get().phases.find(p => p.id === phaseId)
    const maxOrder = phase?.checkpoints.reduce((max, c) => Math.max(max, c.order_index), 0) || 0

    const toastId = toast.loading('Creating Checkpoint...')
    const { data, error } = await supabase
      .from('checkpoints')
      .insert({ title, phase_id: phaseId, order_index: maxOrder + 1 })
      .select()
      .single()

    if (!error && data) {
      toast.success('Checkpoint added!', { id: toastId })
      const newPhases = get().phases.map(p => {
        if (p.id === phaseId) {
          return { ...p, checkpoints: [...p.checkpoints, { ...data, tasks: [] } as Checkpoint] }
        }
        return p
      })
      const { nodes, edges } = generateFlowElements(newPhases)
      const mergedNodes = nodes.map(n => {
         const existing = get().nodes.find(ex => ex.id === n.id)
         return existing ? { ...n, position: existing.position } : n
      })
      set({ phases: newPhases, nodes: mergedNodes, edges })
    } else {
      toast.error(`Database Error: ${error?.message || "Unknown error"}. Missing tables?`, { id: toastId })
    }
  },

  updateNodePosition: async (nodeId, position) => {
    const isPhase = nodeId.startsWith('phase-')
    const dbId = nodeId.replace('phase-', '').replace('checkpoint-', '')
    const table = isPhase ? 'phases' : 'checkpoints'
    
    // Optimistic UI update already handled by React Flow's onNodesChange
    // We just need to persist it and sync the Phase state so next render uses it
    
    const newPhases = get().phases.map(p => {
      if (isPhase && p.id === dbId) {
        return { ...p, position_x: position.x, position_y: position.y }
      }
      if (!isPhase) {
        return {
          ...p,
          checkpoints: p.checkpoints.map(cp => 
            cp.id === dbId ? { ...cp, position_x: position.x, position_y: position.y } : cp
          )
        }
      }
      return p
    })
    
    set({ phases: newPhases })
    
    const supabase = createClient()
    const { error } = await supabase
      .from(table)
      .update({ position_x: position.x, position_y: position.y })
      .eq('id', dbId)
      
    if (error) {
       toast.error(`Failed to save position: ${error.message}`)
    }
  },

  updatePhaseSize: async (phaseId, dimensions) => {
    const newPhases = get().phases.map(p => 
      p.id === phaseId ? { ...p, width: dimensions.width, height: dimensions.height } : p
    )
    set({ phases: newPhases })
    
    const supabase = createClient()
    const { error } = await supabase
      .from('phases')
      .update({ width: dimensions.width, height: dimensions.height })
      .eq('id', phaseId)
      
    if (error) toast.error(`Failed to save phase size: ${error.message}`)
  },
  
  onConnect: async (connection) => {
    // Optimistic UI for edge
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const isSourcePhase = connection.source.startsWith('phase-')
    const isTargetPhase = connection.target.startsWith('phase-')
    
    const sourceDbId = connection.source.replace('checkpoint-', '').replace('phase-', '')
    const targetDbId = connection.target.replace('checkpoint-', '').replace('phase-', '')

    const insertData: any = { user_id: user.id }
    if (isSourcePhase) insertData.source_phase_id = sourceDbId
    else insertData.source_checkpoint_id = sourceDbId
    
    if (isTargetPhase) insertData.target_phase_id = targetDbId
    else insertData.target_checkpoint_id = targetDbId

    const toastId = toast.loading('Connecting...')
    const { data, error } = await supabase
      .from('connections')
      .insert(insertData)
      .select()
      .single()

    if (!error && data) {
      toast.success('Connected', { id: toastId })
      const newEdge = {
        id: `conn-${data.id}`,
        source: connection.source,
        target: connection.target,
        type: 'deletable',
        animated: true,
        data: { 
          dbId: data.id,
          isPhaseConnection: isSourcePhase || isTargetPhase
        }
      }
      set({ edges: [...get().edges, newEdge] })
    } else {
      toast.error(`Failed to connect: ${error?.message || "Unknown"}`, { id: toastId })
    }
  },
  
  deleteConnection: async (dbId, edgeId) => {
    const supabase = createClient()
    const { error } = await supabase.from('connections').delete().eq('id', dbId)
    
    if (!error) {
      set({ edges: get().edges.filter(e => e.id !== edgeId) })
    } else {
      toast.error(`Failed to delete connection: ${error.message}`)
    }
  },

  updatePhase: async (phaseId, title) => {
    const supabase = createClient()
    const { error } = await supabase.from('phases').update({ title }).eq('id', phaseId)
    if (!error) {
      toast.success('Phase updated')
      get().fetchData()
    } else toast.error(error.message)
  },

  deletePhase: async (phaseId) => {
    const supabase = createClient()
    const { error } = await supabase.from('phases').delete().eq('id', phaseId)
    if (!error) {
      toast.success('Phase deleted')
      get().fetchData()
    } else toast.error(error.message)
  },

  updateCheckpoint: async (checkpointId, title) => {
    const supabase = createClient()
    const { error } = await supabase.from('checkpoints').update({ title }).eq('id', checkpointId)
    if (!error) {
      toast.success('Checkpoint updated')
      get().fetchData()
    } else toast.error(error.message)
  },

  deleteCheckpoint: async (checkpointId) => {
    const supabase = createClient()
    const { error } = await supabase.from('checkpoints').delete().eq('id', checkpointId)
    if (!error) {
      toast.success('Checkpoint deleted')
      get().fetchData()
    } else toast.error(error.message)
  },

  updateTask: async (taskId, title) => {
    const supabase = createClient()
    const { error } = await supabase.from('tasks').update({ title }).eq('id', taskId)
    if (!error) {
      toast.success('Task updated')
      get().fetchData()
    } else toast.error(error.message)
  },

  deleteTask: async (taskId) => {
    const supabase = createClient()
    const { error } = await supabase.from('tasks').delete().eq('id', taskId)
    if (!error) {
      toast.success('Task deleted')
      get().fetchData()
    } else toast.error(error.message)
  }
}))
