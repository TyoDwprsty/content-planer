import { create } from 'zustand'
import { createClient } from '@/utils/supabase/client'
import { Node, Edge, applyNodeChanges, applyEdgeChanges, NodeChange, EdgeChange } from '@xyflow/react'
import { toast } from 'react-hot-toast'

export type Canvas = {
  id: string
  user_id: string
  title: string
  created_at: string
}

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
  width: number | null
  height: number | null
  canvas_id: string | null
  layout_mode: string | null
  checkpoints: Checkpoint[]
}

type TrackerState = {
  canvases: Canvas[]
  activeCanvasId: string | null
  phases: Phase[]
  nodes: Node[]
  edges: Edge[]
  isLoading: boolean
  
  createCanvas: (title: string) => Promise<void>
  deleteCanvas: (canvasId: string) => Promise<void>
  setActiveCanvas: (canvasId: string) => void
  clearCanvas: () => Promise<void>
  
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
  updatePhaseLayout: (phaseId: string, layoutMode: 'grid-2' | 'grid-3' | 'free') => Promise<void>
  
  updatePhase: (phaseId: string, title: string) => Promise<void>
  deletePhase: (phaseId: string) => Promise<void>
  updateCheckpoint: (checkpointId: string, title: string) => Promise<void>
  deleteCheckpoint: (checkpointId: string) => Promise<void>
  updateTask: (taskId: string, title: string) => Promise<void>
  deleteTask: (taskId: string) => Promise<void>
  
  deleteConnection: (dbId: string, edgeId: string) => Promise<void>
  
  // AI integration
  generatePlanFromAi: (prompt: string) => Promise<void>
}

// Helper to calculate layout positions based on order
// Constants for layout
const HEADER_HEIGHT = 120 // Phase header reserved area (px)
const CP_WIDTH = 320      // Checkpoint card width (px)
const CP_PADDING = 24     // Padding around checkpoints inside phase (px)
const CP_GAP = 20         // Gap between checkpoints

/**
 * Estimates the rendered height of a Checkpoint card based on task count.
 * Header ~70px + 44px per task + footer ~60px. Min 180px.
 */
function estimateCpHeight(taskCount: number): number {
  return Math.max(180, 70 + taskCount * 44 + 60)
}

/**
 * Computes the ideal positions for all checkpoints in a grid layout.
 * Returns mutated checkpoint array + new phase width/height.
 */
function applyGridLayout(
  checkpoints: Array<{ id: string; tasks: unknown[]; position_x?: number | null; position_y?: number | null; order_index: number }>,
  cols: number,
  existingPhaseWidth?: number | null
): { width: number; height: number } {
  const totalCols = cols
  // Column width: fit inside existing width if available, else default
  const phaseWidth = Math.max(
    existingPhaseWidth || 0,
    CP_PADDING * (totalCols + 1) + CP_WIDTH * totalCols
  )
  const colWidth = Math.floor((phaseWidth - CP_PADDING * (totalCols + 1)) / totalCols)

  const numRows = Math.ceil(checkpoints.length / totalCols)
  let currentY = HEADER_HEIGHT + CP_PADDING

  for (let r = 0; r < numRows; r++) {
    const rowCps = checkpoints.slice(r * totalCols, (r + 1) * totalCols)
    let maxRowHeight = 0

    rowCps.forEach((cp, colIdx) => {
      cp.position_x = CP_PADDING + colIdx * (colWidth + CP_PADDING)
      cp.position_y = currentY
      const h = estimateCpHeight((cp.tasks as unknown[]).length)
      if (h > maxRowHeight) maxRowHeight = h
    })

    currentY += maxRowHeight + CP_GAP
  }

  const phaseHeight = currentY + CP_PADDING
  return { width: phaseWidth, height: phaseHeight }
}

const generateFlowElements = (phases: Phase[]) => {
  const nodes: Node[] = []
  let defaultX = 100
  let defaultY = 100

  phases.forEach((phase) => {
    const phaseNodeId = `phase-${phase.id}`
    const layoutMode = phase.layout_mode || 'grid-2'

    // Always recalculate size from checkpoint positions so phase never clips content
    let phaseW: number
    let phaseH: number

    if (layoutMode !== 'free' && phase.checkpoints.length > 0) {
      // For grid modes, derive size from grid math
      const cols = layoutMode === 'grid-3' ? 3 : 2
      const dims = applyGridLayout([...phase.checkpoints], cols, phase.width)
      phaseW = dims.width
      phaseH = dims.height
    } else {
      // Free mode: compute bounding box from actual positions
      phaseW = CP_PADDING * 2 + CP_WIDTH
      phaseH = HEADER_HEIGHT + CP_PADDING * 2
      phase.checkpoints.forEach((cp) => {
        const x = cp.position_x || CP_PADDING
        const y = cp.position_y || HEADER_HEIGHT + CP_PADDING
        const h = estimateCpHeight(cp.tasks.length)
        const right = x + CP_WIDTH + CP_PADDING
        const bottom = y + h + CP_PADDING
        if (right > phaseW) phaseW = right
        if (bottom > phaseH) phaseH = bottom
      })
    }

    nodes.push({
      id: phaseNodeId,
      type: 'phaseNode',
      position: { x: phase.position_x || defaultX, y: phase.position_y || defaultY },
      data: { title: phase.title, layoutMode },
      style: { zIndex: -1, width: phaseW, height: phaseH },
      dragHandle: '.phase-drag-handle',
    })

    phase.checkpoints.forEach((cp, cpIndex) => {
      // For display, use stored positions (set by applyGridLayout above or by user)
      const x = cp.position_x ?? (CP_PADDING + (cpIndex % 2) * (CP_WIDTH + CP_PADDING))
      const y = cp.position_y ?? (HEADER_HEIGHT + CP_PADDING)

      nodes.push({
        id: `checkpoint-${cp.id}`,
        type: 'checkpointNode',
        position: { x, y },
        parentId: phaseNodeId,
        extent: 'parent',
        data: { checkpoint: cp, phaseId: phase.id, phaseTitle: phase.title },
      })
    })

    defaultX += phaseW + 60
  })

  return { nodes, edges: [] }
}

export const useTrackerStore = create<TrackerState>((set, get) => ({
  canvases: [],
  activeCanvasId: null,
  phases: [],
  nodes: [],
  edges: [],
  isLoading: true,
  
  createCanvas: async (title: string) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data, error } = await supabase.from('canvases').insert({ user_id: user.id, title }).select().single()
    if (!error && data) {
      toast.success('Canvas created')
      await get().fetchData()
      set({ activeCanvasId: data.id })
    }
  },
  
  deleteCanvas: async (canvasId: string) => {
    const supabase = createClient()
    const { error } = await supabase.from('canvases').delete().eq('id', canvasId)
    if (!error) {
      toast.success('Canvas deleted')
      set({ activeCanvasId: null })
      await get().fetchData()
    }
  },
  
  setActiveCanvas: (canvasId: string) => {
    set({ activeCanvasId: canvasId })
    get().fetchData() // Reload phases for new canvas
  },
  
  clearCanvas: async () => {
    const active = get().activeCanvasId
    if (active) await get().deleteCanvas(active)
  },
  
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

    // Fetch canvases
    const { data: canvasesData, error: canvasesError } = await supabase
      .from('canvases')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (canvasesError) {
      toast.error('Failed to load canvases')
      set({ canvases: [], phases: [], nodes: [], edges: [], isLoading: false })
      return
    }

    const canvases = canvasesData || []
    
    // Auto-create a default canvas if none exist
    if (canvases.length === 0) {
      const { data: newCanvas } = await supabase
        .from('canvases')
        .insert({ user_id: user.id, title: 'My Canvas' })
        .select()
        .single()
        
      if (newCanvas) canvases.push(newCanvas)
    }

    let activeId = get().activeCanvasId
    if (!activeId && canvases.length > 0) activeId = canvases[0].id
    
    set({ canvases, activeCanvasId: activeId })
    if (!activeId) {
      set({ phases: [], nodes: [], edges: [], isLoading: false })
      return
    }

    // Fetch phases for active canvas
    const { data: phasesData, error: phasesError } = await supabase
      .from('phases')
      .select('*')
      .eq('canvas_id', activeId)
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
      
      const updatedPhase = newPhases.find(p => p.id === phaseId)
      if (updatedPhase && updatedPhase.layout_mode !== 'free') {
         get().updatePhaseLayout(phaseId, updatedPhase.layout_mode as any)
      }
    } else {
      toast.error(`Database Error: ${error?.message || "Unknown error"}. Missing tables?`, { id: toastId })
    }
  },

  updateNodePosition: async (nodeId, position) => {
    const isPhase = nodeId.startsWith('phase-')
    const dbId = nodeId.replace('phase-', '').replace('checkpoint-', '')
    const table = isPhase ? 'phases' : 'checkpoints'
    
    // Clamp Y to prevent checkpoints from entering Phase Header (Y < 120)
    if (!isPhase) {
      position.y = Math.max(position.y, 120)
    }
    
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
    
    // If we dragged a checkpoint in a grid-locked phase, sort them visually and apply layout
    if (!isPhase) {
      const draggedPhase = newPhases.find(p => p.checkpoints.some(c => c.id === dbId))
      if (draggedPhase && draggedPhase.layout_mode !== 'free') {
        // Sort checkpoints visually: top-to-bottom (Y), then left-to-right (X)
        draggedPhase.checkpoints.sort((a, b) => {
           // Allow 50px tolerance for row grouping
           if (Math.abs((a.position_y || 0) - (b.position_y || 0)) > 50) {
             return (a.position_y || 0) - (b.position_y || 0)
           }
           return (a.position_x || 0) - (b.position_x || 0)
        })
        
        // Re-assign order_index based on visual sort
        draggedPhase.checkpoints.forEach((cp, idx) => cp.order_index = idx)
        
        set({ phases: newPhases })
        // Trigger auto-layout to snap everything perfectly into grid slots
        await get().updatePhaseLayout(draggedPhase.id, draggedPhase.layout_mode as any)
        return
      }
    }
    
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
    const phase = get().phases.find(p => p.id === phaseId)
    if (!phase) return

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
    
    // If in a grid mode, re-snap with new width so columns scale proportionally
    if (phase.layout_mode && phase.layout_mode !== 'free') {
      await get().updatePhaseLayout(phaseId, phase.layout_mode as 'grid-2' | 'grid-3')
    }
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

  updatePhaseLayout: async (phaseId, layoutMode) => {
    const newPhases = [...get().phases]
    const phaseIndex = newPhases.findIndex(p => p.id === phaseId)
    if (phaseIndex === -1) return

    const phase = { ...newPhases[phaseIndex], layout_mode: layoutMode, checkpoints: [...newPhases[phaseIndex].checkpoints] }

    if (layoutMode !== 'free' && phase.checkpoints.length > 0) {
      const cols = layoutMode === 'grid-3' ? 3 : 2
      // applyGridLayout mutates position_x/y on each cp and returns new phase dimensions
      const dims = applyGridLayout(phase.checkpoints, cols, phase.width)
      phase.width = dims.width
      phase.height = dims.height
    }

    newPhases[phaseIndex] = phase

    // Re-generate nodes with new grid positions
    const { nodes } = generateFlowElements(newPhases)
    // Preserve Phase node positions (don't move the Phase itself on canvas)
    const mergedNodes = nodes.map(n => {
      if (n.type === 'phaseNode') {
        const existing = get().nodes.find(ex => ex.id === n.id)
        return existing ? { ...n, position: existing.position } : n
      }
      return n
    })
    set({ phases: newPhases, nodes: mergedNodes })

    // Persist to database
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: PromiseLike<any>[] = []
    updates.push(
      supabase.from('phases')
        .update({ layout_mode: layoutMode, width: phase.width, height: phase.height })
        .eq('id', phaseId)
        .then()
    )
    if (layoutMode !== 'free') {
      for (const cp of phase.checkpoints) {
        updates.push(
          supabase.from('checkpoints')
            .update({ position_x: cp.position_x, position_y: cp.position_y, order_index: cp.order_index })
            .eq('id', cp.id)
            .then()
        )
      }
    }
    await Promise.all(updates)
    toast.success(`Layout: ${layoutMode === 'free' ? 'Free Move' : layoutMode.replace('grid-', '') + ' Columns'}`)
  },

  updatePhase: async (phaseId, title) => {
    const newPhases = get().phases.map(p => p.id === phaseId ? { ...p, title } : p)
    const { nodes } = generateFlowElements(newPhases)
    const mergedNodes = nodes.map(n => {
       const existing = get().nodes.find(ex => ex.id === n.id)
       return existing ? { ...n, position: existing.position } : n
    })
    set({ phases: newPhases, nodes: mergedNodes })

    const supabase = createClient()
    const { error } = await supabase.from('phases').update({ title }).eq('id', phaseId)
    if (!error) toast.success('Phase updated')
    else toast.error(error.message)
  },

  deletePhase: async (phaseId) => {
    const newPhases = get().phases.filter(p => p.id !== phaseId)
    const { nodes } = generateFlowElements(newPhases)
    const mergedNodes = nodes.map(n => {
       const existing = get().nodes.find(ex => ex.id === n.id)
       return existing ? { ...n, position: existing.position } : n
    })
    const edgesToRemove = get().edges.filter(e => e.source.includes(`phase-${phaseId}`) || e.target.includes(`phase-${phaseId}`))
    const newEdges = get().edges.filter(e => !edgesToRemove.includes(e))
    set({ phases: newPhases, nodes: mergedNodes, edges: newEdges })

    const supabase = createClient()
    const { error } = await supabase.from('phases').delete().eq('id', phaseId)
    if (!error) toast.success('Phase deleted')
    else toast.error(error.message)
  },

  updateCheckpoint: async (checkpointId, title) => {
    const newPhases = get().phases.map(p => ({
      ...p,
      checkpoints: p.checkpoints.map(c => c.id === checkpointId ? { ...c, title } : c)
    }))
    const { nodes } = generateFlowElements(newPhases)
    const mergedNodes = nodes.map(n => {
       const existing = get().nodes.find(ex => ex.id === n.id)
       return existing ? { ...n, position: existing.position } : n
    })
    set({ phases: newPhases, nodes: mergedNodes })

    const supabase = createClient()
    const { error } = await supabase.from('checkpoints').update({ title }).eq('id', checkpointId)
    if (!error) toast.success('Checkpoint updated')
    else toast.error(error.message)
  },

  deleteCheckpoint: async (checkpointId) => {
    const newPhases = get().phases.map(p => ({
      ...p,
      checkpoints: p.checkpoints.filter(c => c.id !== checkpointId)
    }))
    const { nodes } = generateFlowElements(newPhases)
    const mergedNodes = nodes.map(n => {
       const existing = get().nodes.find(ex => ex.id === n.id)
       return existing ? { ...n, position: existing.position } : n
    })
    const edgesToRemove = get().edges.filter(e => e.source.includes(`checkpoint-${checkpointId}`) || e.target.includes(`checkpoint-${checkpointId}`))
    const newEdges = get().edges.filter(e => !edgesToRemove.includes(e))
    set({ phases: newPhases, nodes: mergedNodes, edges: newEdges })

    const supabase = createClient()
    const { error } = await supabase.from('checkpoints').delete().eq('id', checkpointId)
    if (!error) toast.success('Checkpoint deleted')
    else toast.error(error.message)
  },

  updateTask: async (taskId, title) => {
    const newPhases = get().phases.map(p => ({
      ...p,
      checkpoints: p.checkpoints.map(c => ({
        ...c,
        tasks: c.tasks.map(t => t.id === taskId ? { ...t, title } : t)
      }))
    }))
    set({ phases: newPhases })

    const supabase = createClient()
    const { error } = await supabase.from('tasks').update({ title }).eq('id', taskId)
    if (!error) toast.success('Task updated')
    else toast.error(error.message)
  },

  deleteTask: async (taskId) => {
    const newPhases = get().phases.map(p => ({
      ...p,
      checkpoints: p.checkpoints.map(c => ({
        ...c,
        tasks: c.tasks.filter(t => t.id !== taskId)
      }))
    }))
    set({ phases: newPhases })

    const supabase = createClient()
    const { error } = await supabase.from('tasks').delete().eq('id', taskId)
    if (!error) toast.success('Task deleted')
    else toast.error(error.message)
  },
  
  generatePlanFromAi: async (prompt: string) => {
    const toastId = toast.loading('Consulting AI...')
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      })
      if (!response.ok) throw new Error('Failed to fetch AI plan')
      const data = await response.json()
      
      toast.loading('Applying AI Plan to Canvas...', { id: toastId })
      
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const activeCanvasId = get().activeCanvasId
      if (!activeCanvasId) throw new Error('No active canvas to place AI content')

      // Sequentially insert data to keep relational integrity
      let currentMaxOrder = get().phases.reduce((max, p) => Math.max(max, p.order_index), 0)
      
      let xPos = 100
      if (get().phases.length > 0) {
         const lastPhase = get().phases[get().phases.length - 1]
         xPos = (lastPhase.position_x || 100) + (lastPhase.width || 400) + 100
      }
      
      for (const p of data.phases) {
         currentMaxOrder++
         
         const { data: phaseData, error: pError } = await supabase
           .from('phases')
           .insert({ title: p.title, user_id: user.id, canvas_id: activeCanvasId, order_index: currentMaxOrder, position_x: xPos, position_y: 100, layout_mode: 'grid-2' })
           .select().single()
           
         if (pError || !phaseData) throw pError
         
         // Build local cp list so applyGridLayout can size the phase
         type LocalCp = { id: string; tasks: unknown[]; position_x?: number | null; position_y?: number | null; order_index: number }
         const localCps: LocalCp[] = []
         
         if (p.checkpoints) {
           let cpOrder = 0
           for (const c of p.checkpoints) {
             const { data: cpData, error: cError } = await supabase
               .from('checkpoints')
               .insert({ title: c.title, phase_id: phaseData.id, order_index: cpOrder + 1, position_x: 0, position_y: 0 })
               .select().single()
             if (cError || !cpData) throw cError
             
             const taskList: unknown[] = []
             if (c.tasks) {
               let taskOrder = 0
               for (const t of c.tasks) {
                 taskOrder++
                 await supabase.from('tasks').insert({ title: t.title, checkpoint_id: cpData.id, order_index: taskOrder })
                 taskList.push(t)
               }
             }
             
             localCps.push({ id: cpData.id, tasks: taskList, order_index: cpOrder })
             cpOrder++
           }
         }
         
         // Compute grid positions + phase dimensions using shared helper
         const dims = applyGridLayout(localCps, 2, null)
         
         // Batch-update checkpoint positions
         await Promise.all(
           localCps.map(cp =>
             supabase.from('checkpoints').update({ position_x: cp.position_x, position_y: cp.position_y }).eq('id', cp.id)
           )
         )
         
         // Update phase with final bounding box
         await supabase.from('phases').update({ width: dims.width, height: dims.height }).eq('id', phaseData.id)
         xPos += dims.width + 60
      }
      
      toast.success('AI Plan Applied! Reloading...', { id: toastId })
      await get().fetchData()
    } catch (error: any) {
      toast.error(`AI Error: ${error.message}`, { id: toastId })
    }
  }
}))
