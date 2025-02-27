const Connection = ({ start, end, onDelete }) => {
  // Calculate the path for the connection using a smoother curve
  const dx = end.x - start.x
  const dy = end.y - start.y

  // Calculate control points for a smoother S-curve
  const midX = (start.x + end.x) / 2
  const controlPoint1X = start.x + (midX - start.x) * 0.5
  const controlPoint2X = end.x - (end.x - midX) * 0.5

  // Create an S-curve path
  const path = `
    M ${start.x},${start.y}
    C ${controlPoint1X},${start.y}
      ${controlPoint2X},${end.y}
      ${end.x},${end.y}
  `

  return (
    <g className="connection">
      <path d={path} stroke="var(--figma-color)" strokeWidth="2" fill="none" filter="url(#glow)" />
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle
        cx={midX}
        cy={(start.y + end.y) / 2}
        r="5"
        fill="var(--figma-color)"
        stroke="none"
        className="connection-delete"
        onClick={onDelete}
      />
    </g>
  )
}

export default Connection

