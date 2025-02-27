"use client"

import { useDragLayer } from "react-dnd"
import { BLOCK_TYPES } from "./BlockTypes" 

const CustomDragLayer = ({ blocks, snapToGrid, gridSize = 20 }) => {
  const {
    itemType,
    isDragging,
    item,
    initialOffset,
    currentOffset,
  } = useDragLayer((monitor) => ({
    item: monitor.getItem(),
    itemType: monitor.getItemType(),
    initialOffset: monitor.getInitialClientOffset(),
    currentOffset: monitor.getClientOffset(),
    isDragging: monitor.isDragging(),
  }))

  // doesntt render if not dragging or missing offsets
  if (!isDragging || !initialOffset || !currentOffset) {
    return null
  }

  // Helper to snap to grid if enabled
  const snapToGridPoint = (value) => {
    if (!snapToGrid) return value
    return Math.round(value / gridSize) * gridSize
  }

  // calculates dragged item position
  const getItemStyles = () => {
    if (!initialOffset || !currentOffset) {
      return {
        display: "none",
      }
    }

    let { x, y } = currentOffset

    if (item.isInPalette) {
      // for new blocks, center under the cursor
      x -= item.width ? item.width / 2 : 100
      y -= 30 // offsets to position at top of block
    } else {
      // for existing blocks, maintain the same relative position
      const deltaX = x - initialOffset.x
      const deltaY = y - initialOffset.y
      
      x = item.left + deltaX
      y = item.top + deltaY
    }

    // apply grid snapping if enabled by the user
    if (snapToGrid) {
      x = snapToGridPoint(x)
      y = snapToGridPoint(y)
    }

    return {
      transform: `translate(${x}px, ${y}px)`,
      WebkitTransform: `translate(${x}px, ${y}px)`,
    }
  }

  const renderItem = () => {
    if (itemType !== "block") return null

    const blockInfo = BLOCK_TYPES[item.blockType]
    
    return (
      <div 
        className="block preview-block"
        style={{
          width: item.width || 200,
          opacity: 0.8,
          backgroundColor: `${blockInfo.color}22`,
          border: `2px solid ${blockInfo.color}`,
          boxShadow: `0 0 10px ${blockInfo.color}`, 
        }}
      >
        <div className="block-header" style={{ backgroundColor: blockInfo.color }}>
          <div className="block-title">{blockInfo.name}</div>
        </div>
        <div className="block-body">
          <p className="block-description">{blockInfo.description}</p>

          {!item.isInPalette && (
            <>
              <div className="block-connectors inputs">
                {blockInfo.inputs.map((input, index) => (
                  <div
                    key={`preview-input-${input}`}
                    className="connector input"
                  >
                    <div className="connector-dot"></div>
                    <span className="connector-label">{input}</span>
                  </div>
                ))}
              </div>
              <div className="block-connectors outputs">
                {blockInfo.outputs.map((output, index) => (
                  <div
                    key={`preview-output-${output}`}
                    className="connector output"
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

  // only render custom layer when dragging comp 
  return (
    <div className="custom-drag-layer">
      <div style={getItemStyles()}>{renderItem()}</div>
    </div>
  )
}

export default CustomDragLayer