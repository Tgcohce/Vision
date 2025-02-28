"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useDrop } from "react-dnd"
import { v4 as uuidv4 } from "uuid"
import { BLOCK_TYPES, getBlockInfo } from "./BlockTypes"
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
  const [canvasSize, setCanvasSize] = useState({ width: 5000, height: 5000 })
  const [connectorPositions, setConnectorPositions] = useState({})
  const [isSaving, setIsSaving] = useState(false)
  // NEW: Track whether the AVS has been saved
  const [isSaved, setIsSaved] = useState(false)

  const canvasRef = useRef(null)
  const connectingLineRef = useRef(null)
  const timeoutRef = useRef(null)

  // Keep current references for zoom and pan to prevent stale closures
  const zoomRef = useRef(zoom)
  const panRef = useRef(pan)

  useEffect(() => {
    zoomRef.current = zoom
    panRef.current = pan
  }, [zoom, pan])

  // Calculate all connector positions based on block data
  const calculateConnectorPositions = useCallback(() => {
    const positions = {}

    blocks.forEach(block => {
      const blockInfo = getBlockInfo(block.blockType, block.subType)
      if (!blockInfo) return

      // Calculate input positions
      if (blockInfo.inputs) {
        blockInfo.inputs.forEach((input, index) => {
          const spacing = 100 / (blockInfo.inputs.length + 1)
          const yOffset = (spacing * (index + 1)) / 100 * 100
          
          positions[`${block.id}-input-${input}`] = {
            x: block.left,
            y: block.top + 50 + yOffset
          }
        })
      }

      // calculates output positions
      if (blockInfo.outputs) {
        blockInfo.outputs.forEach((output, index) => {
          const spacing = 100 / (blockInfo.outputs.length + 1)
          const yOffset = (spacing * (index + 1)) / 100 * 100

          positions[`${block.id}-output-${output}`] = {
            x: block.left + 200, // block width is 200
            y: block.top + 50 + yOffset
          }
        })
      }
    })

    setConnectorPositions(positions)
    return positions
  }, [blocks])

  // Update connections with the latest connector positions
  const updateConnections = useCallback(() => {
    setConnections(prevConnections => 
      prevConnections.map(conn => {
        const fromKey = `${conn.fromId}-output-${conn.fromConnector}`
        const toKey = `${conn.toId}-input-${conn.toConnector}`

        const start = connectorPositions[fromKey]
        const end = connectorPositions[toKey]

        if (start && end) {
          return { ...conn, start, end }
        }

        return conn
      })
    )
  }, [connectorPositions])

  // Calculate positions when blocks change
  useEffect(() => {
    calculateConnectorPositions()
  }, [blocks, calculateConnectorPositions])

  // Update connections when positions change
  useEffect(() => {
    updateConnections()
  }, [connectorPositions, updateConnections])

  // Save current state to history when changes occur
  useEffect(() => {
    if (blocks.length > 0 || connections.length > 0) {
      const currentState = { blocks: [...blocks], connections: [...connections] }

      // Only add to history if it's different from the current state
      if (historyIndex === -1 || JSON.stringify(history[historyIndex]) !== JSON.stringify(currentState)) {
        const newHistory = history.slice(0, historyIndex + 1)
        newHistory.push(currentState)

        // Limit history size
        if (newHistory.length > 30) newHistory.shift()

        setHistory(newHistory)
        setHistoryIndex(newHistory.length - 1)
      }
    }
  }, [blocks, connections, history, historyIndex])

  // Update canvas size when container resizes
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        const container = canvasRef.current.parentElement
        if (container) {
          setCanvasSize({
            width: Math.max(5000, container.clientWidth * 3),
            height: Math.max(5000, container.clientHeight * 3)
          })
        }
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Schedule updates with debouncing
  const scheduleUpdate = useCallback((fn, delay = 50) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      fn()
      timeoutRef.current = null
    }, delay)
  }, [])

  // Undo/Redo functionality
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1]
      setBlocks(prevState.blocks)
      setConnections(prevState.connections)
      setHistoryIndex(historyIndex - 1)
      
      // Deselect any selected items
      setSelectedBlock(null)
      setSelectedConnection(null)
    }
  }, [history, historyIndex])

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1]
      setBlocks(nextState.blocks)
      setConnections(nextState.connections)
      setHistoryIndex(historyIndex + 1)

      // Deselect any selected items
      setSelectedBlock(null)
      setSelectedConnection(null)
    }
  }, [history, historyIndex])

  // Handle deleting selected block
  const handleDeleteBlock = useCallback(() => {
    if (selectedBlock) {
      setBlocks(blocks.filter((block) => block.id !== selectedBlock))
      setConnections(connections.filter((conn) => conn.fromId !== selectedBlock && conn.toId !== selectedBlock))
      setSelectedBlock(null)
    }
  }, [selectedBlock, blocks, connections])

  // Handle deleting a connection
  const handleDeleteConnection = useCallback((connectionId) => {
    setConnections(connections.filter((conn) => conn.id !== connectionId))
    if (selectedConnection === connectionId) {
      setSelectedConnection(null)
    }
  }, [connections, selectedConnection])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Allow shortcuts only when not typing in an input/textarea
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
  }, [
    selectedBlock,
    selectedConnection,
    isConnecting,
    isPanelOpen,
    handleUndo,
    handleRedo,
    handleDeleteBlock,
    handleDeleteConnection
  ])

  // Snap to grid function
  const snapToGridPoint = (value) => {
    if (!snapToGrid || !grid.enabled) return value
    return Math.round(value / grid.size) * grid.size
  }

  // Handle dropping blocks onto the canvas
  const [, drop] = useDrop(() => ({
    accept: "block",
    drop: (item, monitor) => {
      // Get current mouse position
      const clientOffset = monitor.getClientOffset()
      const initialClientOffset = item.initialClientOffset
      const initialSourceClientOffset = item.initialSourceClientOffset
      
      if (!clientOffset || !initialClientOffset || !initialSourceClientOffset) return

      // Calculate position relative to the canvas
      const canvasRect = canvasRef.current.getBoundingClientRect()

      let left, top

      if (item.isInPalette) {
        // Create a new block when dropping from palette
        left = (clientOffset.x - canvasRect.left) / zoom - item.width / 2 + pan.x
        top = (clientOffset.y - canvasRect.top) / zoom - 30 + pan.y // offset block top
      } else {
        // For an existing block
        const deltaX = (clientOffset.x - initialClientOffset.x) / zoom
        const deltaY = (clientOffset.y - initialClientOffset.y) / zoom

        left = item.left + deltaX
        top = item.top + deltaY
      }

      // Apply snap to grid
      left = snapToGridPoint(left)
      top = snapToGridPoint(top)

      if (item.isInPalette) {
        // Create a new block
        const newBlock = {
          id: uuidv4(),
          blockType: item.blockType,
          subType: item.subType,
          left,
          top,
        }
        setBlocks((blocks) => [...blocks, newBlock])
      } else {
        // Move an existing block
        setBlocks((blocks) => 
          blocks.map((block) => (block.id === item.id ? { ...block, left, top } : block))
        )
      }

      // Clear selection on drop
      setSelectedBlock(null)
    },
  }), [zoom, pan, snapToGrid, grid.enabled])

  // Complete a connection
  const handleCompleteConnection = useCallback((blockId, isInput, connectorName) => {
    if (!connectingFrom || connectingFrom.blockId === blockId) {
      setIsConnecting(false)
      setConnectingFrom(null)
      return
    }

    // Must connect input -> output or output -> input
    if (connectingFrom.isInput === isInput) {
      setIsConnecting(false)
      setConnectingFrom(null)
      return
    }

    let sourceId, targetId, sourceConnector, targetConnector

    if (isInput) {
      // connecting TO an input, so connectingFrom is an output
      sourceId = connectingFrom.blockId
      targetId = blockId
      sourceConnector = connectingFrom.connectorName
      targetConnector = connectorName
    } else {
      // connecting TO an output, so connectingFrom is an input
      sourceId = blockId
      targetId = connectingFrom.blockId
      sourceConnector = connectorName
      targetConnector = connectingFrom.connectorName
    }

    // Check if connection already exists
    const connectionExists = connections.some(
      (conn) =>
        conn.fromId === sourceId &&
        conn.toId === targetId &&
        conn.fromConnector === sourceConnector &&
        conn.toConnector === targetConnector
    )
    if (connectionExists) {
      setIsConnecting(false)
      setConnectingFrom(null)
      return
    }

    // Get connector positions
    const startKey = `${sourceId}-output-${sourceConnector}`
    const endKey = `${targetId}-input-${targetConnector}`
    
    const start = connectorPositions[startKey]
    const end = connectorPositions[endKey]

    if (start && end) {
      const sourceBlock = blocks.find(b => b.id === sourceId)
      const targetBlock = blocks.find(b => b.id === targetId)
      if (sourceBlock && targetBlock) {
        const newConnection = {
          id: uuidv4(),
          fromId: sourceId,
          toId: targetId,
          fromConnector: sourceConnector,
          toConnector: targetConnector,
          start,
          end,
          type: "default",
          sourceType: sourceBlock.blockType,
          targetType: targetBlock.blockType,
        }
        setConnections(prev => [...prev, newConnection])
      }
    }

    setIsConnecting(false)
    setConnectingFrom(null)
  }, [blocks, connections, connectingFrom, connectorPositions])

  // Start a connection
  const handleStartConnection = useCallback((blockId, isInput, connectorName, connectorRect) => {
    const block = blocks.find((b) => b.id === blockId)
    if (!block) return
    
    const key = `${blockId}-${isInput ? 'input' : 'output'}-${connectorName}`
    const position = connectorPositions[key]

    if (position) {
      setConnectingFrom({
        blockId,
        isInput,
        connectorName,
        x: position.x,
        y: position.y,
      })
      setConnectingTo({
        x: position.x,
        y: position.y
      })
    } else {
      // Fallback to DOM calculation
      const canvasRect = canvasRef.current.getBoundingClientRect()
      const x = isInput 
        ? (connectorRect.left - canvasRect.left) / zoomRef.current + panRef.current.x 
        : (connectorRect.right - canvasRect.left) / zoomRef.current + panRef.current.x
      const y = (connectorRect.top + connectorRect.height/2 - canvasRect.top) / zoomRef.current + panRef.current.y

      setConnectingFrom({
        blockId,
        isInput,
        connectorName,
        x,
        y,
      })
      setConnectingTo({ x, y })
    }
    setIsConnecting(true)
  }, [blocks, connectorPositions])

  // Mouse move for connection line
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isConnecting && connectingFrom) {
        const canvasRect = canvasRef.current.getBoundingClientRect()
        const canvasMouseX = (e.clientX - canvasRect.left) / zoomRef.current + panRef.current.x
        const canvasMouseY = (e.clientY - canvasRect.top) / zoomRef.current + panRef.current.y
        setConnectingTo({ x: canvasMouseX, y: canvasMouseY })
        
        highlightPotentialTargets(e.clientX, e.clientY)
      }
    }

    const highlightPotentialTargets = (mouseX, mouseY) => {
      document.querySelectorAll('.connector-highlight').forEach(el => {
        el.classList.remove('connector-highlight')
      })
      setValidConnection(false)

      const allConnectors = document.querySelectorAll('.connector')
      let closestConnector = null
      let minDistance = Infinity

      allConnectors.forEach(connectorEl => {
        // Skip same block’s same-type connector
        const blockId = connectorEl.closest('.block')?.dataset.blockId
        if (!blockId) return

        const isInput = connectorEl.classList.contains('input')
        const connectorName = connectorEl.dataset.connectorName

        if (
          connectingFrom.blockId === blockId && 
          connectingFrom.isInput === isInput && 
          connectingFrom.connectorName === connectorName
        ) return

        // Must be input->output or output->input
        if (connectingFrom.isInput === isInput) return

        // Distance check
        const connectorDot = connectorEl.querySelector('.connector-dot')
        if (!connectorDot) return

        const rect = connectorDot.getBoundingClientRect()
        const connectorX = rect.left + rect.width / 2
        const connectorY = rect.top + rect.height / 2
        const distance = Math.sqrt(
          (mouseX - connectorX) ** 2 + 
          (mouseY - connectorY) ** 2
        )

        // 75px detection radius
        if (distance < 75 && distance < minDistance) {
          minDistance = distance
          closestConnector = { element: connectorEl, blockId, isInput, connectorName }
        }
      })

      // Highlight the closest connector
      if (closestConnector) {
        closestConnector.element.classList.add('connector-highlight')
        setValidConnection(true)

        // If we have a pre-calculated position for it
        const key = `${closestConnector.blockId}-${closestConnector.isInput ? 'input' : 'output'}-${closestConnector.connectorName}`
        const position = connectorPositions[key]
        if (position) {
          setConnectingTo({ x: position.x, y: position.y })
        } else {
          // Fallback to DOM if needed
          const connectorDot = closestConnector.element.querySelector('.connector-dot')
          if (connectorDot) {
            const rect = connectorDot.getBoundingClientRect()
            const canvasRect = canvasRef.current.getBoundingClientRect()
            const x = closestConnector.isInput
              ? (rect.left - canvasRect.left) / zoomRef.current + panRef.current.x
              : (rect.right - canvasRect.left) / zoomRef.current + panRef.current.x
            const y = (rect.top + rect.height/2 - canvasRect.top) / zoomRef.current + panRef.current.y
            setConnectingTo({ x, y })
          }
        }
      }
    }

    const handleMouseUp = (e) => {
      if (isConnecting) {
        // Check if we dropped on a highlighted connector
        const highlightedConnector = document.querySelector('.connector-highlight')
        if (highlightedConnector) {
          const blockId = highlightedConnector.closest('.block').dataset.blockId
          const isInput = highlightedConnector.classList.contains('input')
          const connectorName = highlightedConnector.dataset.connectorName
          handleCompleteConnection(blockId, isInput, connectorName)
        } else {
          // Otherwise, cancel
          setIsConnecting(false)
          setConnectingFrom(null)
        }
        document.querySelectorAll('.connector-highlight').forEach(el => {
          el.classList.remove('connector-highlight')
        })
      }
    }

    if (isConnecting) {
      window.addEventListener("mousemove", handleMouseMove)
      window.addEventListener("mouseup", handleMouseUp)
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [
    isConnecting,
    connectingFrom,
    handleCompleteConnection,
    connectorPositions
  ])

  // Canvas panning
  const handleCanvasMouseDown = useCallback((e) => {
    if (e.button === 0) {  // left click
      if (
        e.target.classList.contains("canvas") || 
        e.target.classList.contains("canvas-content")
      ) {
        setIsDraggingCanvas(true)
        setDragStart({ x: e.clientX, y: e.clientY })
        e.target.style.cursor = "grabbing"
        
        // Deselect if user just clicks on empty canvas
        setSelectedBlock(null)
        setSelectedConnection(null)
      }
    }
  }, [])

  const handleCanvasMouseMove = useCallback((e) => {
    if (isDraggingCanvas) {
      const dx = (e.clientX - dragStart.x) / zoom
      const dy = (e.clientY - dragStart.y) / zoom
      setPan(prevPan => ({ x: prevPan.x + dx, y: prevPan.y + dy }))
      setDragStart({ x: e.clientX, y: e.clientY })
    }
  }, [isDraggingCanvas, dragStart, zoom])

  const handleCanvasMouseUp = useCallback(() => {
    if (isDraggingCanvas) {
      setIsDraggingCanvas(false)
      document.querySelectorAll(".canvas, .canvas-content").forEach(el => {
        el.style.cursor = "default"
      })
    }
  }, [isDraggingCanvas])

  // Wheel zoom
  const handleWheel = useCallback((e) => {
    e.preventDefault()
    const canvasRect = canvasRef.current.getBoundingClientRect()
    const mouseX = (e.clientX - canvasRect.left) / zoom
    const mouseY = (e.clientY - canvasRect.top) / zoom

    const delta = e.deltaY > 0 ? -0.05 : 0.05
    const newZoom = Math.max(0.2, Math.min(2, zoom + delta))

    // Zoom toward cursor
    if (newZoom !== zoom) {
      const zoomRatio = newZoom / zoom
      const newPanX = mouseX - (mouseX - pan.x) * zoomRatio
      const newPanY = mouseY - (mouseY - pan.y) * zoomRatio
      setPan({ x: newPanX, y: newPanY })
      setZoom(newZoom)
    }
  }, [zoom, pan])

  // Block selection
  const handleBlockClick = useCallback((blockId) => {
    setSelectedBlock(blockId)
    setSelectedConnection(null)
  }, [])

  // Connection selection
  const handleConnectionClick = useCallback((connectionId) => {
    setSelectedConnection(connectionId)
    setSelectedBlock(null)
  }, [])

  // Duplicate a block
  const handleDuplicateBlock = useCallback(() => {
    if (selectedBlock) {
      const blockToDuplicate = blocks.find(block => block.id === selectedBlock)
      if (blockToDuplicate) {
        const newBlock = {
          ...blockToDuplicate,
          id: uuidv4(),
          left: blockToDuplicate.left + grid.size * 2,
          top: blockToDuplicate.top + grid.size * 2
        }
        setBlocks(prevBlocks => [...prevBlocks, newBlock])
        setSelectedBlock(newBlock.id)
      }
    }
  }, [selectedBlock, blocks, grid.size])

  // Toggle snap to grid
  const toggleSnapToGrid = useCallback(() => {
    setSnapToGrid(prev => !prev)
  }, [])

  // Toggle grid
  const toggleGrid = useCallback(() => {
    setGrid(prev => ({ ...prev, enabled: !prev.enabled }))
  }, [])

  // Reset zoom/pan
  const resetView = useCallback(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [])

  // SAVE AVS
  const handleSaveAVS = useCallback(() => {
    setIsSaving(true)

    const avsConfig = {
      blocks: blocks.map(block => ({
        id: block.id,
        type: block.blockType,
        subType: block.subType,
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

    try {
      localStorage.setItem('savedAvsConfig', JSON.stringify(avsConfig))
      setTimeout(() => {
        setIsSaving(false)
        // NEW: Mark as saved
        setIsSaved(true)
        alert('AVS configuration built and saved successfully!')
      }, 500)
    } catch (error) {
      console.error("Error saving configuration:", error)
      setIsSaving(false)
      alert("Error saving configuration. Please try again.")
    }
  }, [blocks, connections])

  const handleDeployAVS = useCallback(async () => {
    // should be good for deploymenent, directly linked this to the index.js file in the backend portion
    try {
  
      const response = await fetch('/api/deployment/deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // JSON token bearer
        },
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData?.error || 'Deployment failed');
      }
  
      const result = await response.json();
      alert(result.message || 'Deployment initiated successfully!');
    } catch (error) {
      console.error('Deployment error:', error);
      alert(`Deployment failed: ${error.message}`);
    }
  }, []);

  // Connection pointer class
  const getConnectionPointerClass = useCallback(() => {
    if (!isConnecting) return ""
    return validConnection ? "connection-valid" : "connection-invalid"
  }, [isConnecting, validConnection])

  return (
    <div className="workspace-container">
      <div className={`sidebar ${isPanelOpen ? "open" : "closed"}`}>
        <div className="sidebar-header">
          <h2>AVS Components</h2>
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

          {/* Build AVS (Save) Button */}
          <button 
            className={`action-button save-button ${isSaving ? 'saving' : ''}`} 
            onClick={handleSaveAVS}
            disabled={isSaving || blocks.length === 0}
          >
            {isSaving ? 'Saving...' : 'Build AVS'}
          </button>

          {/* NEW: Deploy Button, only if isSaved === true */}
          {isSaved && (
            <button 
              className="action-button deploy-button" 
              onClick={handleDeployAVS}
            >
              Deploy AVS
            </button>
          )}
        </div>
      </div>

      <div 
        className="canvas-container" 
        onWheel={handleWheel}
      >
        <CustomDragLayer 
          blocks={blocks} 
          snapToGrid={snapToGrid} 
          gridSize={grid.size} 
        />

        <div className="canvas-controls">
          <button 
            onClick={() => {
              setZoom(prevZoom => Math.min(2, prevZoom + 0.1))
            }} 
            title="Zoom In"
          >
            +
          </button>
          <span>{Math.round(zoom * 100)}%</span>
          <button 
            onClick={() => {
              setZoom(prevZoom => Math.max(0.2, prevZoom - 0.1))
            }} 
            title="Zoom Out"
          >
            -
          </button>

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
              <button 
                className="control-button delete-button" 
                onClick={handleDeleteBlock} 
                title="Delete"
              >
                🗑️
              </button>
              <button 
                className="control-button duplicate-button" 
                onClick={handleDuplicateBlock} 
                title="Duplicate"
              >
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
          style={{ cursor: isDraggingCanvas ? "grabbing" : "default" }}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
        >
          <div 
            className={`canvas-content ${grid.enabled ? 'grid-enabled' : ''}`}
            style={{
              transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
              width: canvasSize.width,
              height: canvasSize.height,
            }}
          >
            <svg className="connections-layer">
              {/* Connection line during connection creation */}
              {isConnecting && (
                <path
                  ref={connectingLineRef}
                  d={`M ${connectingFrom.x},${connectingFrom.y} 
                      C ${connectingFrom.x + 50},${connectingFrom.y} 
                        ${connectingTo.x - 50},${connectingTo.y} 
                        ${connectingTo.x},${connectingTo.y}`}
                  stroke={validConnection ? "var(--connection-valid-color, #4caf50)" : "var(--connection-invalid-color, #f44336)"}
                  strokeWidth="2"
                  strokeDasharray="5,5"
                  fill="none"
                  className="connecting-line"
                />
              )}

              {/* Existing connections */}
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

            {/* Blocks */}
            {blocks.map((block) => (
              <Block
                key={block.id}
                id={block.id}
                left={block.left}
                top={block.top}
                blockType={block.blockType}
                blockInfo={getBlockInfo(block.blockType, block.subType)}
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
