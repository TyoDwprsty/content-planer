import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from '@xyflow/react'
import { X } from 'lucide-react'
import { useTrackerStore } from '@/store/useTrackerStore'

export function DeletableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })
  
  const { deleteConnection } = useTrackerStore()

  // Determine color based on connection type
  const isPhaseConn = data?.isPhaseConnection
  const edgeColor = isPhaseConn ? '#a855f7' : '#3b82f6' // Purple for phase, Blue for checkpoint
  const customStyle = { ...style, stroke: edgeColor, strokeWidth: 3 }

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={customStyle} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <button
            className="w-5 h-5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full flex items-center justify-center text-zinc-500 hover:text-red-500 hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors shadow-sm"
            onClick={() => {
              if (confirm("Delete this connection?")) {
                if (data?.dbId) deleteConnection(data.dbId as string, id)
              }
            }}
          >
            <X size={12} />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
