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
  const [needsConnectorUpdate, setNeedsConnectorUpdate] = useState(false)
  
  const canvasRef = useRef(null)
  const connectingLineRef = useRef(null)
  const connectorsRef = useRef(new Map()) // Store connector positions
  const updateTimeout = useRef(null) // Reference for debouncing updates

  // Update connector positions when blocks move
  const updateConnectorPositions = useCallback(() => {
    if (!canvasRef.current) return;
    
    const newConnectorMap = new Map()
    
    blocks.forEach(block => {
      const blockEl = document.querySelector(`.block[data-block-id="${block.id}"]`)
      if (!blockEl) return
      
      const blockRect = blockEl.getBoundingClientRect()
      const canvasRect = canvasRef.current.getBoundingClientRect()
      
      // Process input connectors
      const inputConnectors = blockEl.querySelectorAll('.connector.input')
      inputConnectors.forEach(connector => {
        const connectorName = connector.dataset.connectorName
        const connectorDot = connector.querySelector('.connector-dot')
        if (!connectorDot) return
        
        const dotRect = connectorDot.getBoundingClientRect()
        const position = {
          x: (dotRect.left - canvasRect.left) / zoom + pan.x,
          y: (dotRect.top + dotRect.height/2 - canvasRect.top) / zoom + pan.y
        }
        
        newConnectorMap.set(`${block.id}-input-${connectorName}`, position)
      })
      
      // Process output connectors
      const outputConnectors = blockEl.querySelectorAll('.connector.output')
      outputConnectors.forEach(connector => {
        const connectorName = connector.dataset.connectorName
        const connectorDot = connector.querySelector('.connector-dot')
        if (!connectorDot) return
        
        const dotRect = connectorDot.getBoundingClientRect()
        const position = {
          x: (dotRect.right - canvasRect.left) / zoom + pan.x,
          y: (dotRect.top + dotRect.height/2 - canvasRect.top) / zoom + pan.y
        }
        
        newConnectorMap.set(`${block.id}-output-${connectorName}`, position)
      })
    })
    
    connectorsRef.current = newConnectorMap
    
    // Update connections based on new connector positions
    setConnections(prevConnections => 
      prevConnections.map(conn => {
        const fromKey = `${conn.fromId}-output-${conn.fromConnector}`
        const toKey = `${conn.toId}-input-${conn.toConnector}`
        
        const start = newConnectorMap.get(fromKey)
        const end = newConnectorMap.get(toKey)
        
        if (start && end) {
          return { ...conn, start, end }
        }
        
        return conn
      })
    )
    
    // Reset the update flag
    setNeedsConnectorUpdate(false)
  }, [blocks, zoom, pan])

  // Run updateConnectorPositions after render and when blocks change or on mouse events
  useEffect(() => {
    // Clear any existing timeout to prevent multiple updates
    if (updateTimeout.current) {
      clearTimeout(updateTimeout.current)
    }
    
    // Schedule an update with a small delay to allow DOM to update
    if (needsConnectorUpdate) {
      updateTimeout.current = setTimeout(() => {
        updateConnectorPositions()
        updateTimeout.current = null
      }, 50)
    }
    
    return () => {
      if (updateTimeout.current) {
        clearTimeout(updateTimeout.current)
      }
    }
  }, [needsConnectorUpdate, updateConnectorPositions])

  // Update connector positions when blocks change, zoom changes, or pan changes
  useEffect(() => {
    setNeedsConnectorUpdate(true)
  }, [blocks, zoom, pan])

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

  // Listen to mouse events on the document to update connections when mouse is released
  useEffect(() => {
    const handleMouseUp = () => {
      // Force connector position update after any mouse interaction
      setNeedsConnectorUpdate(true)
    }
    
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mouseup', handleMouseUp)
    }
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
      
      // Force connector position update after undo
      setNeedsConnectorUpdate(true)
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
      
      // Force connector position update after redo
      setNeedsConnectorUpdate(true)
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
  
  // Handle dropping blocks onto the canvas with improved positioning
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
        // Create a new block when dropping from palette - position at drop point
        left = (clientOffset.x - canvasRect.left) / zoom - item.width / 2 + pan.x
        top = (clientOffset.y - canvasRect.top) / zoom - 30 + pan.y // Offset from mouse to top of block
      } else {
        // Calculate the drag delta for existing blocks
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
        // Move existing block
        setBlocks((blocks) => 
          blocks.map((block) => (block.id === item.id ? { ...block, left, top } : block))
        )
      }
      
      // Clear any selection when dropping
      setSelectedBlock(null)
      
      // Schedule connector position update
      setNeedsConnectorUpdate(true)
      
      return undefined
    },
  }), [zoom, pan, snapToGrid, grid.enabled])
  
  // Handle completing a connection with improved positioning and validation
  const handleCompleteConnection = useCallback((blockId, isInput, connectorName) => {
    if (!connectingFrom || connectingFrom.blockId === blockId) {
      setIsConnecting(false)
      setConnectingFrom(null)
      return
    }

    // Make sure we're connecting an input to an output (or vice versa)
    if (connectingFrom.isInput === isInput) {
      setIsConnecting(false)
      setConnectingFrom(null)
      return
    }

    // Get source and target block info
    let sourceId, targetId, sourceConnector, targetConnector
    
    if (isInput) {
      // We're connecting TO an input, so the source is the connectingFrom (which must be an output)
      sourceId = connectingFrom.blockId
      targetId = blockId
      sourceConnector = connectingFrom.connectorName
      targetConnector = connectorName
    } else {
      // We're connecting TO an output, so the source is the current block
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

    // Get connector positions from our reference map
    const start = connectorsRef.current.get(`${sourceId}-output-${sourceConnector}`)
    const end = connectorsRef.current.get(`${targetId}-input-${targetConnector}`)
    
    // Create new connection with proper metadata
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
  }, [blocks, connections, connectingFrom])
  
  // Handle starting a connection with improved coordinate tracking
  const handleStartConnection = useCallback((blockId, isInput, connectorName, connectorRect) => {
    const block = blocks.find((b) => b.id === blockId)
    if (!block) return

    // Calculate position relative to the canvas
    const canvasRect = canvasRef.current.getBoundingClientRect()
    
    // Get connector position from DOM
    const key = `${blockId}-${isInput ? 'input' : 'output'}-${connectorName}`
    const savedPosition = connectorsRef.current.get(key)
    
    let position
    if (savedPosition) {
      position = savedPosition
    } else {
      // Fallback to calculation if not in map
      const x = isInput ? 
        (connectorRect.left - canvasRect.left) / zoom + pan.x : 
        (connectorRect.right - canvasRect.left) / zoom + pan.x
      
      const y = (connectorRect.top + connectorRect.height/2 - canvasRect.top) / zoom + pan.y
      
      position = { x, y }
    }

    setConnectingFrom({
      blockId,
      isInput,
      connectorName,
      x: position.x,
      y: position.y,
    })

    setConnectingTo(position)
    setIsConnecting(true)
  }, [blocks, zoom, pan])
  
  // Handle mouse movement when creating connections with improved connector highlighting
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isConnecting && connectingFrom) {
        // Calculate position relative to the canvas with proper zoom and pan adjustment
        const canvasRect = canvasRef.current.getBoundingClientRect()
        const canvasMouseX = (e.clientX - canvasRect.left) / zoom + pan.x
        const canvasMouseY = (e.clientY - canvasRect.top) / zoom + pan.y
        
        setConnectingTo({ x: canvasMouseX, y: canvasMouseY })
        
        // Highlight potential connection targets
        highlightPotentialTargets(e.clientX, e.clientY)
      }
    }
    
    // Improved connector highlighting with better distance calculation
    const highlightPotentialTargets = (mouseX, mouseY) => {
      // First remove all highlights
      document.querySelectorAll('.connector-highlight').forEach(el => {
        el.classList.remove('connector-highlight')
      })
      
      setValidConnection(false)
      
      // Get all potential connectors
      const allConnectors = document.querySelectorAll('.connector')
      let closestConnector = null
      let minDistance = Infinity
      
      allConnectors.forEach(connectorEl => {
        // Skip if this is the source connector
        const blockId = connectorEl.closest('.block')?.dataset.blockId
        if (!blockId) return
        
        const isInput = connectorEl.classList.contains('input')
        const connectorName = connectorEl.dataset.connectorName
        
        if (connectingFrom.blockId === blockId && 
            connectingFrom.isInput === isInput && 
            connectingFrom.connectorName === connectorName) {
          return
        }
        
        // Inputs can only connect to outputs and vice versa
        if (connectingFrom.isInput === isInput) return
        
        // Calculate distance to connector
        const rect = connectorEl.getBoundingClientRect()
        const connectorX = rect.left + rect.width / 2
        const connectorY = rect.top + rect.height / 2
        
        const distance = Math.sqrt(
          Math.pow(mouseX - connectorX, 2) + 
          Math.pow(mouseY - connectorY, 2)
        )
        
        // Track the closest connector
        if (distance < 50 && distance < minDistance) { // Increased detection radius
          minDistance = distance
          closestConnector = {
            element: connectorEl,
            blockId,
            isInput,
            connectorName
          }
        }
      })
      
      // Highlight the closest connector if one is found
      if (closestConnector) {
        closestConnector.element.classList.add('connector-highlight')
        setValidConnection(true)
        
        // Update connecting line end point to snap to this connector
        const rect = closestConnector.element.getBoundingClientRect()
        const canvasRect = canvasRef.current.getBoundingClientRect()
        
        // Calculate proper position based on connector type (input vs output)
        const x = closestConnector.isInput 
          ? (rect.left - canvasRect.left) / zoom + pan.x
          : (rect.right - canvasRect.left) / zoom + pan.x
        
        const y = (rect.top + rect.height/2 - canvasRect.top) / zoom + pan.y
        
        setConnectingTo({ x, y })
      }
    }

    const handleMouseUp = (e) => {
      if (isConnecting) {
        // Find highlighted connector
        const highlightedConnector = document.querySelector('.connector-highlight')
        
        if (highlightedConnector) {
          const blockId = highlightedConnector.closest('.block').dataset.blockId
          const isInput = highlightedConnector.classList.contains('input')
          const connectorName = highlightedConnector.dataset.connectorName
          
          // Complete the connection
          handleCompleteConnection(blockId, isInput, connectorName)
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

    if (isConnecting) {
      window.addEventListener("mousemove", handleMouseMove)
      window.addEventListener("mouseup", handleMouseUp)
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isConnecting, connectingFrom, zoom, pan, handleCompleteConnection])

  // Improved canvas mouse event handling for panning
  const handleCanvasMouseDown = useCallback((e) => {
    if (e.button === 0) {  // Left mouse button
      // Only initiate drag if clicking directly on canvas background (not on a block or connection)
      if (e.target.classList.contains("canvas") || 
          e.target.classList.contains("canvas-content")) {
        setIsDraggingCanvas(true)
        setDragStart({ x: e.clientX, y: e.clientY })
        e.target.style.cursor = "grabbing"
        
        // Deselect any selected items when clicking on canvas
        setSelectedBlock(null)
        setSelectedConnection(null)
      }
    }
  }, [])

  const handleCanvasMouseMove = useCallback((e) => {
    if (isDraggingCanvas) {
      const dx = (e.clientX - dragStart.x) / zoom
      const dy = (e.clientY - dragStart.y) / zoom
      setPan(prevPan => ({ 
        x: prevPan.x + dx, 
        y: prevPan.y + dy 
      }))
      setDragStart({ x: e.clientX, y: e.clientY })
    }
  }, [isDraggingCanvas, dragStart, zoom])

  const handleCanvasMouseUp = useCallback(() => {
    if (isDraggingCanvas) {
      setIsDraggingCanvas(false)
      document.querySelectorAll(".canvas, .canvas-content").forEach(el => {
        el.style.cursor = "default"
      })
      
      // Force connector position update after panning
      setNeedsConnectorUpdate(true)
    }
  }, [isDraggingCanvas])
  
  // Optimized wheel handling for smoother zooming
  const handleWheel = useCallback((e) => {
    e.preventDefault()
    
    // Calculate position to zoom around (mouse position)
    const canvasRect = canvasRef.current.getBoundingClientRect()
    const mouseX = (e.clientX - canvasRect.left) / zoom
    const mouseY = (e.clientY - canvasRect.top) / zoom
    
    // Calculate zoom delta with smoother increments
    const delta = e.deltaY > 0 ? -0.05 : 0.05
    const newZoom = Math.max(0.2, Math.min(2, zoom + delta))
    
    // Adjust pan to zoom toward mouse position
    if (newZoom !== zoom) {
      const zoomRatio = newZoom / zoom
      const newPanX = mouseX - (mouseX - pan.x) * zoomRatio
      const newPanY = mouseY - (mouseY - pan.y) * zoomRatio
      
      setPan({ x: newPanX, y: newPanY })
      setZoom(newZoom)
      
      // Force connector positions update after zoom
      setNeedsConnectorUpdate(true)
    }
  }, [zoom, pan])

  // Block selection with proper event propagation
  const handleBlockClick = useCallback((blockId) => {
    setSelectedBlock(blockId)
    setSelectedConnection(null)
  }, [])
  
  // Connection selection with proper event propagation
  const handleConnectionClick = useCallback((connectionId) => {
    setSelectedConnection(connectionId)
    setSelectedBlock(null)
  }, [])

  // Duplicate selected block with proper positioning
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
        
        // Force connector position update
        setNeedsConnectorUpdate(true)
      }
    }
  }, [selectedBlock, blocks, grid.size])

  // Toggle grid snap with visual feedback
  const toggleSnapToGrid = useCallback(() => {
    setSnapToGrid(prev => !prev)
  }, [])
  
  // Toggle grid visibility
  const toggleGrid = useCallback(() => {
    setGrid(prev => ({...prev, enabled: !prev.enabled}))
  }, [])

  // Reset canvas view and maintain connections
  const resetView = useCallback(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
    
    // Force connector position update after reset
    setNeedsConnectorUpdate(true)
  }, [])

  // Handle saving the AVS configuration
  const handleSaveAVS = useCallback(() => {
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
    // Here you would integrate with your backend API
    alert("AVS configuration saved!")
  }, [blocks, connections])

  // Get connection pointer classname based on valid status
  const getConnectionPointerClass = useCallback(() => {
    if (!isConnecting) return ""
    return validConnection ? "connection-valid" : "connection-invalid"
  }, [isConnecting, validConnection])
  
  // Render the workspace with optimized layout and performance
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
          <button className="action-button save-button" onClick={handleSaveAVS}>
            Build AVS
          </button>
        </div>
      </div>

      <div 
        className="canvas-container" 
        onWheel={handleWheel}
      >
        {/* Custom drag layer for preview */}
        <CustomDragLayer blocks={blocks} snapToGrid={snapToGrid} gridSize={grid.size} />
        
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
              width: canvasSize.width,
              height: canvasSize.height,
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