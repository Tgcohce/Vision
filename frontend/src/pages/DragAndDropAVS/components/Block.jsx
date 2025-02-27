"use client"

import { useDrag } from "react-dnd"
import { getEmptyImage } from "react-dnd-html5-backend"
import { useEffect, useRef } from "react"

const Block = ({ id, left, top, blockType, blockInfo, isInPalette, onConnect, selected, onClick }) => {
  const blockRef = useRef(null)
  
  // Enhanced drag configuration with better item properties
  const [{ isDragging }, drag, preview] = useDrag(() => ({
    type: "block",
    item: (monitor) => {
      const initialClientOffset = monitor.getInitialClientOffset()
      const initialSourceClientOffset = monitor.getInitialSourceClientOffset()
      
      return {
        id,
        left,
        top,
        blockType,
        isInPalette,
        // Store both offsets for precise positioning
        initialClientOffset,
        initialSourceClientOffset,
        width: blockRef.current ? blockRef.current.offsetWidth : 200,
        height: blockRef.current ? blockRef.current.offsetHeight : 150,
      }
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }))

  // Use empty image as drag preview for custom preview rendering
  useEffect(() => {
    preview(getEmptyImage(), { captureDraggingState: true })
  }, [preview])

  const handleConnectorMouseDown = (e, isInput, connectorName) => {
    e.stopPropagation()
    e.preventDefault() // Prevent text selection during drag
    onConnect && onConnect(id, isInput, connectorName, e.currentTarget.getBoundingClientRect())
  }

  // Calculate connector positions for more precise connections
  const getConnectorPosition = (isInput, index, total) => {
    // This helps distribute connectors evenly
    const spacing = 100 / (total + 1)
    return {
      top: `${spacing * (index + 1)}%`
    }
  }

  const style = {
    left,
    top,
    opacity: isDragging ? 0.5 : 1,
    cursor: "move",
    border: selected ? `2px solid ${blockInfo.color}` : "1px solid rgba(255, 255, 255, 0.1)",
    backgroundColor: `${blockInfo.color}22`,
    boxShadow: selected ? `0 0 10px ${blockInfo.color}` : "var(--block-shadow)",
    transform: isDragging ? "scale(1.05)" : "scale(1)",
    transition: "transform 0.2s, box-shadow 0.2s, border 0.2s",
  }

  return (
    <div
      ref={(node) => {
        drag(node)
        blockRef.current = node
      }}
      className={`block ${isInPalette ? "palette-block" : "canvas-block"} ${selected ? "selected" : ""} ${isDragging ? "dragging" : ""}`}
      style={style}
      onClick={(e) => {
        e.stopPropagation()
        onClick && onClick(id)
      }}
      data-block-id={id}
      data-block-type={blockType}
    >
      <div className="block-header" style={{ backgroundColor: blockInfo.color }}>
        <div className="block-title">{blockInfo.name}</div>
      </div>
      <div className="block-body">
        <p className="block-description">{blockInfo.description}</p>

        {!isInPalette && (
          <>
            <div className="block-connectors inputs">
              {blockInfo.inputs.map((input, index) => (
                <div
                  key={`input-${input}`}
                  className="connector input"
                  style={getConnectorPosition(true, index, blockInfo.inputs.length)}
                  onMouseDown={(e) => handleConnectorMouseDown(e, true, input)}
                  data-connector-type="input"
                  data-connector-name={input}
                >
                  <div className="connector-dot"></div>
                  <span className="connector-label">{input}</span>
                </div>
              ))}
            </div>
            <div className="block-connectors outputs">
              {blockInfo.outputs.map((output, index) => (
                <div
                  key={`output-${output}`}
                  className="connector output"
                  style={getConnectorPosition(false, index, blockInfo.outputs.length)}
                  onMouseDown={(e) => handleConnectorMouseDown(e, false, output)}
                  data-connector-type="output"
                  data-connector-name={output}
                >
                  <span className="connector-label">{output}</span>
                  <div className="connector-dot"></div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default Block