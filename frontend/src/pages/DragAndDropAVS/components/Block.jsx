"use client"

import { useDrag } from "react-dnd"
import { getEmptyImage } from "react-dnd-html5-backend"
import { useEffect, useRef, useState } from "react"

const Block = ({ id, left, top, blockType, blockInfo, isInPalette, onConnect, selected, onClick }) => {
  const blockRef = useRef(null)
  const [expanded, setExpanded] = useState(false)
  const [subType, setSubType] = useState(null)
  
  // Improved drag configuration with enhanced coordinate tracking
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
        subType,
        isInPalette,
        initialClientOffset,
        initialSourceClientOffset,
        width: blockRef.current ? blockRef.current.offsetWidth : 200,
        height: blockRef.current ? blockRef.current.offsetHeight : 150,
      }
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [id, left, top, blockType, subType, isInPalette])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (blockRef.current && !blockRef.current.contains(event.target) && expanded) {
        setExpanded(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [expanded])

  // Use empty image as drag preview for custom preview rendering
  useEffect(() => {
    preview(getEmptyImage(), { captureDraggingState: true })
  }, [preview])

  const handleConnectorMouseDown = (e, isInput, connectorName) => {
    e.stopPropagation()
    e.preventDefault() // Prevent text selection during drag
    
    // Get connector position more precisely
    const connectorDot = e.currentTarget.querySelector('.connector-dot')
    const rect = connectorDot.getBoundingClientRect()
    
    onConnect && onConnect(id, isInput, connectorName, rect)
  }

  // More precise connector positioning with better distribution
  const getConnectorPosition = (isInput, index, total) => {
    const spacing = 100 / (total + 1)
    return {
      top: `${spacing * (index + 1)}%`
    }
  }

  // Toggle dropdown options
  const toggleDropdown = (e) => {
    if (isInPalette) {
      e.stopPropagation()
      setExpanded(!expanded)
    }
  }

  // Handle subtype selection
  const handleSubTypeSelect = (e, type) => {
    e.stopPropagation()
    setSubType(type)
    setExpanded(false)
  }

  // Get the actual block info to display
  const displayInfo = subType && blockInfo.subtypes && blockInfo.subtypes[subType] 
    ? blockInfo.subtypes[subType]
    : blockInfo

  const style = {
    left,
    top,
    opacity: isDragging ? 0.5 : 1,
    cursor: isInPalette ? "pointer" : "move",
    border: selected ? `2px solid ${displayInfo.color}` : "1px solid rgba(255, 255, 255, 0.1)",
    backgroundColor: `${displayInfo.color}22`,
    boxShadow: selected ? `0 0 10px ${displayInfo.color}` : "var(--block-shadow)",
    transform: isDragging ? "scale(1.05)" : "scale(1)",
    transition: "transform 0.2s, box-shadow 0.2s, border 0.2s",
    zIndex: selected || isDragging ? 100 : 10,
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
        if (!isInPalette || subType) {
          onClick && onClick(id)
        }
      }}
      data-block-id={id}
      data-block-type={blockType}
      data-sub-type={subType}
    >
      <div 
        className="block-header" 
        style={{ 
          backgroundColor: displayInfo.color,
          cursor: isInPalette ? "pointer" : "move"
        }}
        onClick={isInPalette ? toggleDropdown : undefined}
      >
        <div className="block-title">
          {isInPalette ? (
            <div className="block-dropdown">
              <span>{!subType ? blockInfo.name : displayInfo.name}</span>
              <span className="dropdown-arrow">{expanded ? "▲" : "▼"}</span>
            </div>
          ) : (
            displayInfo.name
          )}
        </div>
      </div>
      
      {isInPalette && expanded && blockInfo.subtypes && (
        <div className="block-dropdown-menu">
          {/* Add the main type as first option */}
          <div 
            key={`subtype-main`} 
            className={`dropdown-item ${!subType ? 'active' : ''}`}
            onClick={(e) => handleSubTypeSelect(e, null)}
          >
            {blockInfo.name} (Default)
          </div>
          
          {/* Add all subtypes */}
          {Object.entries(blockInfo.subtypes).map(([type, info]) => (
            <div 
              key={`subtype-${type}`} 
              className={`dropdown-item ${subType === type ? 'active' : ''}`}
              onClick={(e) => handleSubTypeSelect(e, type)}
            >
              {info.name}
            </div>
          ))}
        </div>
      )}

      {(!isInPalette || subType) && (
        <div className="block-body">
          <p className="block-description">{displayInfo.description}</p>

          {!isInPalette && (
            <>
              <div className="block-connectors inputs">
                {displayInfo.inputs.map((input, index) => (
                  <div
                    key={`input-${input}`}
                    className="connector input"
                    style={getConnectorPosition(true, index, displayInfo.inputs.length)}
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
                {displayInfo.outputs.map((output, index) => (
                  <div
                    key={`output-${output}`}
                    className="connector output"
                    style={getConnectorPosition(false, index, displayInfo.outputs.length)}
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
      )}
      
      {isInPalette && !subType && !expanded && (
        <div className="block-placeholder">
          <p>Click to select component type</p>
        </div>
      )}
    </div>
  )
}

export default Block