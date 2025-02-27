"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useDrop } from "react-dnd"
import { v4 as uuidv4 } from "uuid"
import { BLOCK_TYPES } from "./BlockTypes"
import Block from "./Block"
import Connection from "./Connection"
import CustomDragLayer from "./CustomDragLayer"

const Workspace = () => {
  const [blocks, setBlocks] = useState([])
  const [connections, setConnections] = useState([])
  const [connectingFrom, setConnectingFrom] = useState(null)
  const [connectingTo, setConnectingTo] = useState({ x: 0, y: 0 })
  const [isConnecting, setIsConnecting] = useState(false)
  const [selectedBlock, setSelectedBlock] = useState(null)
  const [selectedConnection, setSelectedConnection] = useState(null)
  const [isPanelOpen, setIsPanelOpen] = useState(true)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [grid, setGrid] = useState({ enabled: true, size: 20 })
  const [validConnection, setValidConnection] = useState(false)
  const [snapToGrid, setSnapToGrid] = useState(true)
  const [history, setHistory] = useState([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  
  const canvasRef = useRef(null)
  const connectingLineRef = useRef(null)

  // Save current state to history when changes occur
  useEffect(() => {
    if (blocks.length > 0 || connections.length > 0) {
      const currentState = { blocks: [...blocks], connections: [...connections] }
      
      // Only add to history if it's different from the current state
      if (historyIndex === -1 || JSON.stringify(history[historyIndex]) !== JSON.stringify(currentState)) {
        const newHistory = history.slice(0, historyIndex + 1)
        newHistory.push(currentState)
        
        // Limit history size to prevent memory issues
        if (newHistory.length > 30) newHistory.shift()
        
        setHistory(newHistory)
        setHistoryIndex(newHistory.length - 1)
      }
    }
  }, [blocks, connections, history, historyIndex])

  // Undo/Redo functionality
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1]
      setBlocks(prevState.blocks)
      setConnections(prevState.connections)
      setHistoryIndex(historyIndex - 1)
    }
  }, [history, historyIndex])

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1]
      setBlocks(nextState.blocks)
      setConnections(nextState.connections)
      setHistoryIndex(historyIndex + 1)
    }
  }, [history, historyIndex])

  // handle deleting selected block
  const handleDeleteBlock = useCallback(() => {
    if (selectedBlock) {
      setBlocks(blocks.filter((block) => block.id !== selectedBlock))
      setConnections(connections.filter((conn) => conn.fromId !== selectedBlock && conn.toId !== selectedBlock))
      setSelectedBlock(null)
    }
  }, [selectedBlock, blocks, connections])

  // handle deleting a connection
  const handleDeleteConnection = useCallback((connectionId) => {
    setConnections(connections.filter((conn) => conn.id !== connectionId))
    if (selectedConnection === connectionId) {
      setSelectedConnection(null)
    }
  }, [connections, selectedConnection])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Allow shortcuts only when not typing in an input field
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return

      // Undo: Ctrl+Z
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault()
        handleUndo()
      }
      
      // Redo: Ctrl+Y or Ctrl+Shift+Z
      if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
        e.preventDefault()
        handleRedo()
      }
      
      // Delete: Delete key
      if (e.key === 'Delete') {
        if (selectedBlock) handleDeleteBlock()
        if (selectedConnection) handleDeleteConnection(selectedConnection)
      }
      
      // Deselect: Escape key
      if (e.key === 'Escape') {
        setSelectedBlock(null)
        setSelectedConnection(null)
        if (isConnecting) {
          setIsConnecting(false)
          setConnectingFrom(null)
        }
      }
      
      // Toggle panel: Tab
      if (e.key === 'Tab') {
        e.preventDefault()
        setIsPanelOpen(!isPanelOpen)
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedBlock, selectedConnection, isConnecting, isPanelOpen, handleUndo, handleRedo, handleDeleteBlock, handleDeleteConnection])

  // Snap to grid function
  const snapToGridPoint = (value) => {
    if (!snapToGrid || !grid.enabled) return value
    return Math.round(value / grid.size) * grid.size
  }

  // handle dropping blocks onto the canvas
  const [, drop] = useDrop(() => ({
    accept: "block",
    drop: (item, monitor) => {
      const clientOffset = monitor.getClientOffset()
      const initialClientOffset = item.initialClientOffset
      const initialSourceClientOffset = item.initialSourceClientOffset
      
      if (!clientOffset || !initialClientOffset || !initialSourceClientOffset) return

      // Calculate position relative to the canvas
      const canvasRect = canvasRef.current.getBoundingClientRect()
      
      let left, top
      
      if (item.isInPalette) {
        // Create a new block when dropping from palette - position at drop point
        left = (clientOffset.x - canvasRect.left) / zoom - item.width / 2
        top = (clientOffset.y - canvasRect.top) / zoom - 30 // Offset from mouse to top of block
      } else {
        // Calculate the drag delta for existing blocks
        const deltaX = (clientOffset.x - initialClientOffset.x) / zoom
        const deltaY = (clientOffset.y - initialClientOffset.y) / zoom
        
        left = item.left + deltaX
        top = item.top + deltaY
      }
      
      // applies snap to grid
      left = snapToGridPoint(left)
      top = snapToGridPoint(top)

      if (item.isInPalette) {
        // Create a new block
        const newBlock = {
          id: uuidv4(),
          blockType: item.blockType,
          left,
          top,
        }
        setBlocks((blocks) => [...blocks, newBlock])
      } else {
        // moves existing block
        setBlocks((blocks) => 
          blocks.map((block) => (block.id === item.id ? { ...block, left, top } : block))
        )
        
        // Updatess connections
        setConnections((connections) =>
          connections.map((conn) => {
            let updatedConn = { ...conn }
            

            const findConnectorPosition = (blockId, isInput, connectorName) => {
              const block = blocks.find(b => b.id === blockId)
              if (!block) return null
              
              // This is a simplification - ideally this would use the actual rendered position if possible lol
              const blockLeft = blockId === item.id ? left : block.left
              const blockTop = blockId === item.id ? top : block.top
              
              if (isInput) {
                return { 
                  x: blockLeft, 
                  y: blockTop + 50 + 25 * (BLOCK_TYPES[block.blockType].inputs.indexOf(connectorName) || 0)
                }
              } else {
                return { 
                  x: blockLeft + 200, 
                  y: blockTop + 50 + 25 * (BLOCK_TYPES[block.blockType].outputs.indexOf(connectorName) || 0)
                }
              }
            }
            
            if (conn.fromId === item.id) {
              const newPos = findConnectorPosition(item.id, false, conn.fromConnector)
              if (newPos) updatedConn.start = newPos
            }
            
            if (conn.toId === item.id) {
              const newPos = findConnectorPosition(item.id, true, conn.toConnector)
              if (newPos) updatedConn.end = newPos
            }
            
            return updatedConn
          })
        )
      }
      
      // Clear any selection when dropping
      setSelectedBlock(null)
      return undefined
    },
  }))

  // handle completing a connection
  const handleCompleteConnection = useCallback((blockId, isInput, connectorName) => {
    if (!connectingFrom || connectingFrom.blockId === blockId) {
      setIsConnecting(false)
      setConnectingFrom(null)
      return
    }

    // Make sure we're connecting an input to an output
    if (connectingFrom.isInput === isInput) {
      setIsConnecting(false)
      setConnectingFrom(null)
      return
    }

    const fromBlock = blocks.find((b) => b.id === connectingFrom.blockId)
    const toBlock = blocks.find((b) => b.id === blockId)

    if (!fromBlock || !toBlock) {
      setIsConnecting(false)
      setConnectingFrom(null)
      return
    }

    // determine which is the source and which is the target
    let sourceId, targetId, sourceConnector, targetConnector
    let start = { ...connectingFrom }, end = { ...connectingTo }

    if (connectingFrom.isInput) {
      sourceId = blockId
      targetId = connectingFrom.blockId
      sourceConnector = connectorName
      targetConnector = connectingFrom.connectorName
      
      //  start and end points based off movement
      end = { ...connectingFrom }
      
      // Get the correct position for the start
      const sourceEl = document.querySelector(
        `.block[data-block-id="${blockId}"] .connector.output[data-connector-name="${connectorName}"] .connector-dot`
      )
      
      if (sourceEl) {
        const rect = sourceEl.getBoundingClientRect()
        const canvasRect = canvasRef.current.getBoundingClientRect()
        start = { 
          x: rect.right - canvasRect.left + pan.x,
          y: rect.top + rect.height/2 - canvasRect.top + pan.y
        }
      }
    } else {
      sourceId = connectingFrom.blockId
      targetId = blockId
      sourceConnector = connectingFrom.connectorName
      targetConnector = connectorName
      start = { ...connectingFrom }
      
      // Get the correct position for the end
      const targetEl = document.querySelector(
        `.block[data-block-id="${blockId}"] .connector.input[data-connector-name="${connectorName}"] .connector-dot`
      )
      
      if (targetEl) {
        const rect = targetEl.getBoundingClientRect()
        const canvasRect = canvasRef.current.getBoundingClientRect()
        end = { 
          x: rect.left - canvasRect.left + pan.x,
          y: rect.top + rect.height/2 - canvasRect.top + pan.y
        }
      }
    }

    // checks if connection already exists
    const connectionExists = connections.some(
      (conn) =>
        conn.fromId === sourceId &&
        conn.toId === targetId &&
        conn.fromConnector === sourceConnector &&
        conn.toConnector === targetConnector,
    )

    if (!connectionExists) {
      const newConnection = {
        id: uuidv4(),
        fromId: sourceId,
        toId: targetId,
        fromConnector: sourceConnector,
        toConnector: targetConnector,
        start,
        end,
        type: "default",
        sourceType: BLOCK_TYPES[fromBlock.blockType].type,
        targetType: BLOCK_TYPES[toBlock.blockType].type,
      }
      
      setConnections(prev => [...prev, newConnection])
    }

    setIsConnecting(false)
    setConnectingFrom(null)
  }, [blocks, connectingFrom, connectingTo, connections, pan])

  // handle mouse move for drawing connections
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isConnecting && connectingFrom) {
        // Calculate position relative to the canvas
        const canvasRect = canvasRef.current.getBoundingClientRect()
        const canvasMouseX = (e.clientX - canvasRect.left) / zoom
        const canvasMouseY = (e.clientY - canvasRect.top) / zoom
        
        setConnectingTo({ 
          x: canvasMouseX + pan.x, 
          y: canvasMouseY + pan.y 
        })
        
        // Highlight potential connection targets
        highlightPotentialTargets(canvasMouseX, canvasMouseY)
      }
    }

    const handleMouseUp = (e) => {
      if (isConnecting) {
        // Try to find if we're over a valid connector
        const targetConnector = findConnectorUnderMouse(e)
        
        if (targetConnector) {
          // Complete the connection to this connector
          handleCompleteConnection(
            targetConnector.blockId, 
            targetConnector.isInput, 
            targetConnector.connectorName
          )
        } else {
          // Cancel the connection
          setIsConnecting(false)
          setConnectingFrom(null)
        }
        
        // Remove any highlights
        document.querySelectorAll('.connector-highlight').forEach(el => {
          el.classList.remove('connector-highlight')
        })
      }
    }
    
    // Highlight potential connection targets
    const highlightPotentialTargets = (mouseX, mouseY) => {
      // First remove all highlights
      document.querySelectorAll('.connector-highlight').forEach(el => {
        el.classList.remove('connector-highlight')
      })
      
      setValidConnection(false)
      
      // Get all potential connectors
      const allConnectors = document.querySelectorAll('.connector')
      
      allConnectors.forEach(connectorEl => {
        // Skip if this is the source connector
        const blockId = connectorEl.closest('.block').dataset.blockId
        const isInput = connectorEl.classList.contains('input')
        const connectorName = connectorEl.dataset.connectorName
        
        if (connectingFrom.blockId === blockId && 
            connectingFrom.isInput === isInput && 
            connectingFrom.connectorName === connectorName) {
          return
        }
        
        // Inputs can only connect to outputs and vice versa
        if (connectingFrom.isInput === isInput) return
        
        // If the connector is close enough to the mouse, highlight it
        const rect = connectorEl.getBoundingClientRect()
        const canvasRect = canvasRef.current.getBoundingClientRect()
        
        const connectorX = (rect.left - canvasRect.left + rect.width/2) / zoom
        const connectorY = (rect.top - canvasRect.top + rect.height/2) / zoom
        
        const distance = Math.sqrt(
          Math.pow(mouseX - connectorX, 2) + 
          Math.pow(mouseY - connectorY, 2)
        )
        
        if (distance < 30) {  
          connectorEl.classList.add('connector-highlight')
          setValidConnection(true)
          // fix for mouse drag issues, test later
          
          // uupdate connecting line end point to snap to this connector
          setConnectingTo({
            x: connectorX + pan.x,
            y: connectorY + pan.y
          })
        }
      })
    }
    
    // Find a connector element under the mouse
    const findConnectorUnderMouse = (e) => {
      const allConnectors = document.querySelectorAll('.connector')
      
      for (const connectorEl of allConnectors) {
        const rect = connectorEl.getBoundingClientRect()
        
        if (e.clientX >= rect.left && e.clientX <= rect.right &&
            e.clientY >= rect.top && e.clientY <= rect.bottom) {
          
          const blockId = connectorEl.closest('.block').dataset.blockId
          const isInput = connectorEl.classList.contains('input')
          const connectorName = connectorEl.dataset.connectorName
          
          // don't allow connecting to self or same type (input->input or output->output)
          if (connectingFrom.blockId === blockId && 
              connectingFrom.isInput === isInput) {
            return null
          }
          
          // Inputs can only connect to outputs and vice versa
          if (connectingFrom.isInput === isInput) return null
          
          return { blockId, isInput, connectorName }
        }
      }
      
      return null
    }

    if (isConnecting) {
      window.addEventListener("mousemove", handleMouseMove)
      window.addEventListener("mouseup", handleMouseUp)
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isConnecting, connectingFrom, zoom, pan, handleCompleteConnection])

  // handle starting a connection
  const handleStartConnection = (blockId, isInput, connectorName, connectorRect) => {
    const block = blocks.find((b) => b.id === blockId)
    if (!block) return

    // calculates the position relative to the canvas
    const canvasRect = canvasRef.current.getBoundingClientRect()
    
    const x = isInput ? 
      connectorRect.left - canvasRect.left + pan.x : 
      connectorRect.right - canvasRect.left + pan.x
    
    const y = connectorRect.top + connectorRect.height/2 - canvasRect.top + pan.y

    setConnectingFrom({
      blockId,
      isInput,
      connectorName,
      x,
      y,
    })

    setConnectingTo({ x, y })
    setIsConnecting(true)
  }

  // handle canvas mouse events for panning
  const handleCanvasMouseDown = (e) => {
    if (e.button === 0) {  // left mouse button
      if (e.target.classList.contains("canvas") || 
          e.target.classList.contains("canvas-content")) {
        setIsDraggingCanvas(true)
        setDragStart({ x: e.clientX, y: e.clientY })
        e.target.style.cursor = "grabbing"
        
        // deselects any selected items when clicking on canvas
        setSelectedBlock(null)
        setSelectedConnection(null)
      }
    }
  }

  const handleCanvasMouseMove = (e) => {
    if (isDraggingCanvas) {
      const dx = (e.clientX - dragStart.x) / zoom
      const dy = (e.clientY - dragStart.y) / zoom
      setPan({ x: pan.x + dx, y: pan.y + dy })
      setDragStart({ x: e.clientX, y: e.clientY })
    }
  }

  const handleCanvasMouseUp = () => {
    setIsDraggingCanvas(false)
    document.querySelectorAll(".canvas, .canvas-content").forEach(el => {
      el.style.cursor = "default"
    })
  }

  // handles zooming with mouse wheel
  const handleWheel = (e) => {
    e.preventDefault()
    
    // Calculate position to zoom around the mouse pos
    const canvasRect = canvasRef.current.getBoundingClientRect()
    const mouseX = (e.clientX - canvasRect.left) / zoom
    const mouseY = (e.clientY - canvasRect.top) / zoom
    
    // calculates zoom delta
    const delta = e.deltaY > 0 ? -0.05 : 0.05
    const newZoom = Math.max(0.2, Math.min(2, zoom + delta))
    
    // Adjust pan to zoom toward mouse position
    // my curren math implementation ensures the point under the mouse stays under the mouse
    if (newZoom !== zoom) {
      const zoomRatio = newZoom / zoom
      const newPanX = mouseX - (mouseX - pan.x) * zoomRatio
      const newPanY = mouseY - (mouseY - pan.y) * zoomRatio
      
      setPan({ x: newPanX, y: newPanY })
      setZoom(newZoom)
    }
  }

  // handle block selection
  const handleBlockClick = (blockId) => {
    setSelectedBlock(blockId)
    setSelectedConnection(null)
  }
  
  // Handle connection selection
  const handleConnectionClick = (connectionId) => {
    setSelectedConnection(connectionId)
    setSelectedBlock(null)
  }

  // handle duplicate block
  const handleDuplicateBlock = () => {
    if (selectedBlock) {
      const blockToDuplicate = blocks.find(block => block.id === selectedBlock)
      if (blockToDuplicate) {
        const newBlock = {
          ...blockToDuplicate,
          id: uuidv4(),
          left: blockToDuplicate.left + 20,
          top: blockToDuplicate.top + 20
        }
        setBlocks([...blocks, newBlock])
        setSelectedBlock(newBlock.id)
      }
    }
  }

  // Toggle grid snap
  const toggleSnapToGrid = () => {
    setSnapToGrid(!snapToGrid)
  }
  
  // Toggle grid visibility
  const toggleGrid = () => {
    setGrid({...grid, enabled: !grid.enabled})
  }

  // Reset canvas view
  const resetView = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  // handle saving the AVS configuration
  const handleSaveAVS = () => {
    const avsConfig = {
      blocks: blocks.map(block => ({
        id: block.id,
        type: block.blockType,
        position: { x: block.left, y: block.top }
      })),
      connections: connections.map(conn => ({
        id: conn.id,
        sourceId: conn.fromId,
        sourceConnector: conn.fromConnector,
        targetId: conn.toId,
        targetConnector: conn.toConnector
      }))
    }
    
    console.log("Saving AVS configuration:", avsConfig)
    alert("AVS configuration saved!")
  }

  // Custom drag layer for preview
  const renderCustomDragLayer = () => {
    return <CustomDragLayer blocks={blocks} snapToGrid={snapToGrid} gridSize={grid.size} />
  }
  
  // Get connection pointer classname based on valid status
  const getConnectionPointerClass = () => {
    if (!isConnecting) return ""
    return validConnection ? "connection-valid" : "connection-invalid"
  }

  return (
    <div className="workspace-container">
      <div className={`sidebar ${isPanelOpen ? "open" : "closed"}`}>
        <div className="sidebar-header">
          <h2>Components</h2>
          <button className="toggle-sidebar" onClick={() => setIsPanelOpen(!isPanelOpen)}>
            {isPanelOpen ? "◀" : "▶"}
          </button>
        </div>
        <div className="block-palette">
          {Object.keys(BLOCK_TYPES).map((type) => (
            <Block 
              key={type} 
              id={`palette-${type}`} 
              blockType={type} 
              blockInfo={BLOCK_TYPES[type]}
              left={0} 
              top={0} 
              isInPalette={true} 
            />
          ))}
        </div>
        <div className="sidebar-footer">
          <div className="sidebar-actions">
            <button 
              className={`action-button ${grid.enabled ? 'active' : ''}`} 
              onClick={toggleGrid} 
              title="Toggle Grid"
            >
              Grid
            </button>
            <button 
              className={`action-button ${snapToGrid ? 'active' : ''}`} 
              onClick={toggleSnapToGrid} 
              title="Toggle Snap to Grid"
            >
              Snap
            </button>
            <button 
              className="action-button" 
              onClick={resetView} 
              title="Reset View"
            >
              Reset
            </button>
          </div>
          <button className="action-button save-button" onClick={handleSaveAVS}>
            Build AVS
          </button>
        </div>
      </div>

      <div 
        className="canvas-container" 
        onWheel={handleWheel}
      >
        {/* Add custom drag layer */}
        {renderCustomDragLayer()}
        
        <div className="canvas-controls">
          <button onClick={() => setZoom(Math.min(2, zoom + 0.1))} title="Zoom In">+</button>
          <span>{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(Math.max(0.2, zoom - 0.1))} title="Zoom Out">-</button>
          
          <div className="canvas-controls-divider"></div>
          
          {/* Undo/Redo */}
          <button 
            onClick={handleUndo} 
            disabled={historyIndex <= 0}
            className={historyIndex <= 0 ? 'disabled' : ''}
            title="Undo"
          >
            ↩
          </button>
          <button 
            onClick={handleRedo} 
            disabled={historyIndex >= history.length - 1}
            className={historyIndex >= history.length - 1 ? 'disabled' : ''}
            title="Redo"
          >
            ↪
          </button>
          
          <div className="canvas-controls-divider"></div>
          
          {/* Block controls */}
          {selectedBlock && (
            <>
              <button className="control-button delete-button" onClick={handleDeleteBlock} title="Delete">
                🗑️
              </button>
              <button className="control-button duplicate-button" onClick={handleDuplicateBlock} title="Duplicate">
                📋
              </button>
            </>
          )}
          
          {/* Connection controls */}
          {selectedConnection && (
            <button 
              className="control-button delete-button" 
              onClick={() => handleDeleteConnection(selectedConnection)}
              title="Delete Connection"
            >
              🗑️
            </button>
          )}
        </div>

        <div
          ref={(node) => {
            drop(node)
            canvasRef.current = node
          }}
          className={`canvas ${getConnectionPointerClass()}`}
          style={{
            cursor: isDraggingCanvas ? "grabbing" : "default",
          }}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
        >
          <div 
            className={`canvas-content ${grid.enabled ? 'grid-enabled' : ''}`}
            style={{
              transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
            }}
          >
            <svg className="connections-layer">
              {/* Connection active line when making new connections */}
              {isConnecting && (
                <path
                  ref={connectingLineRef}
                  d={`M ${connectingFrom.x},${connectingFrom.y} C 
                    ${connectingFrom.x + 50},${connectingFrom.y} 
                    ${connectingTo.x - 50},${connectingTo.y} 
                    ${connectingTo.x},${connectingTo.y}`}
                  stroke={validConnection ? "var(--connection-valid-color, #4caf50)" : "var(--connection-invalid-color, #f44336)"}
                  strokeWidth="2"
                  strokeDasharray="5,5"
                  fill="none"
                  className="connecting-line"
                />
              )}
              
              {/* Render all existing connections */}
              {connections.map((conn) => (
                <Connection
                  key={conn.id}
                  id={conn.id}
                  start={conn.start}
                  end={conn.end}
                  type={conn.type}
                  sourceType={conn.sourceType}
                  targetType={conn.targetType}
                  isActive={selectedConnection === conn.id}
                  onDelete={() => handleDeleteConnection(conn.id)}
                  onClick={() => handleConnectionClick(conn.id)}
                />
              ))}
            </svg>

            {/* Render all blocks */}
            {blocks.map((block) => (
              <Block
                key={block.id}
                id={block.id}
                left={block.left}
                top={block.top}
                blockType={block.blockType}
                blockInfo={BLOCK_TYPES[block.blockType]}
                isInPalette={false}
                onConnect={isConnecting ? handleCompleteConnection : handleStartConnection}
                selected={selectedBlock === block.id}
                onClick={handleBlockClick}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Workspace