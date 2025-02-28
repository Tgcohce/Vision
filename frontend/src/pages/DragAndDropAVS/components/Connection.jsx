"use client"

import { memo } from "react"

// Optimized Connection component
const Connection = memo(({ id, start, end, type, onDelete, isActive, sourceType, targetType, onClick }) => {
  // Don't render if we don't have valid start and end points
  if (!start || !end || !start.x === undefined || !end.x === undefined) {
    return null;
  }
  
  // Calculate the path for the connection using a smoother curve
  const dx = end.x - start.x
  const dy = end.y - start.y
  const isHorizontal = Math.abs(dx) > Math.abs(dy)
  
  // Dynamic control points calculation based on distance and direction
  const distance = Math.sqrt(dx * dx + dy * dy)
  const baseTension = 0.4
  const tension = Math.min(baseTension, distance / 500)
  
  let controlPoint1X, controlPoint1Y, controlPoint2X, controlPoint2Y
  
  if (isHorizontal) {
    // For horizontal connections, adds a natural curve
    const curvature = Math.min(Math.abs(dx) * tension, 150)
    
    controlPoint1X = start.x + curvature
    controlPoint1Y = start.y
    controlPoint2X = end.x - curvature
    controlPoint2Y = end.y
  } else {
    // For vertical connections, curve outward slightly
    const curvature = Math.min(Math.abs(dy) * tension, 100)
    
    controlPoint1X = start.x
    controlPoint1Y = start.y + (dy > 0 ? curvature : -curvature)
    controlPoint2X = end.x
    controlPoint2Y = end.y - (dy > 0 ? curvature : -curvature)
  }
  
  // Create a smooth curve path
  const path = `
    M ${start.x},${start.y}
    C ${controlPoint1X},${controlPoint1Y}
      ${controlPoint2X},${controlPoint2Y}
      ${end.x},${end.y}
  `
  
  // Select colors based on connection type and active state
  const getConnectionColor = () => {
    if (isActive) return "var(--connection-active-color, #ffcc00)"
    
    // Default connection color with fallback
    return "var(--figma-color, #c59dd8)"
  }
  
  const connectionColor = getConnectionColor()
  
  // Calculate the middle point for the delete button
  const midPoint = {
    x: (controlPoint1X + controlPoint2X) / 2,
    y: (controlPoint1Y + controlPoint2Y) / 2
  }
  
  // Add a subtle animation for active connections
  const activeClass = isActive ? "connection-active" : ""
  
  return (
    <g 
      className={`connection ${activeClass}`} 
      data-connection-id={id}
      onClick={(e) => {
        e.stopPropagation()
        onClick && onClick(id)
      }}
    >
      {/* Connection shadow for depth */}
      <path
        d={path}
        stroke="rgba(0,0,0,0.3)"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      
      {/* Glow effect layer */}
      <path
        d={path}
        className="connection-glow"
        stroke={connectionColor}
        strokeWidth="6"
        strokeOpacity="0.3"
        fill="none"
        strokeLinecap="round"
      />
      
      {/* Main connection line */}
      <path 
        d={path} 
        className="connection-line" 
        stroke={connectionColor} 
        strokeWidth="2.5" 
        fill="none"
        strokeLinecap="round"
      />
      
      {/* Connection flow animation */}
      <path
        d={path}
        className="connection-flow"
        stroke="white"
        strokeWidth="2"
        fill="none"
        strokeDasharray="5 15"
        strokeLinecap="round"
        opacity="0.6"
      />
      
      {/* Delete button */}
      <g 
        className="connection-delete" 
        transform={`translate(${midPoint.x},${midPoint.y})`} 
        onClick={(e) => {
          e.stopPropagation()
          onDelete && onDelete(id)
        }}
      >
        <circle r="8" fill={connectionColor} className="delete-bg" />
        <path
          d="M-3,-3 L3,3 M-3,3 L3,-3"
          stroke="#000"
          strokeWidth="1.5"
          className="delete-x"
        />
      </g>
    </g>
  )
})

Connection.displayName = 'Connection'

export default Connection