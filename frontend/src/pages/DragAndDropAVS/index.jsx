"use client"

import { useState, useEffect } from "react"
import { DndProvider, useDrag, useDrop } from "react-dnd"
import { HTML5Backend } from "react-dnd-html5-backend"
import { v4 as uuidv4 } from "uuid"
import Header from "../LandingPage/Header"
import "./DragAndDropAVS.css"

// Block types with their properties
const BLOCK_TYPES = {
  VALIDATOR: {
    type: "validator",
    name: "Validator",
    color: "#7C3AED",
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt",
    // "validates transactions and maintains consensus",
    inputs: ["data"],
    outputs: ["validation"],
  },
  STORAGE: {
    type: "storage",
    name: "comp 1",
    color: "#C59DD8",
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt",
    // stores and retrieves data on-chain",
    inputs: ["write"],
    outputs: ["read"],
  },
  COMPUTE: {
    type: "compute",
    name: "comp 2",
    color: "#3E2C4A",
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt",
    // performs complex computations off-chain",
    inputs: ["request"],
    outputs: ["result"],
  },
  ORACLE: {
    type: "oracle",
    name: "comp 3",
    color: "#2d16e9",
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt", 
    // provides external data to the blockchain",
    inputs: ["query"],
    outputs: ["data"],
  },
  CONTRACT: {
    type: "contract",
    name: "comp 4",
    color: "#06091C",
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt",
    // executes business logic on the blockchain",
    inputs: ["trigger"],
    outputs: ["execution"],
  },
}

const Block = ({ id, left, top, blockType, isInPalette, onConnect, selected, onClick }) => {
  const blockInfo = BLOCK_TYPES[blockType]

  const [{ isDragging }, drag] = useDrag(() => ({
    type: "block",
    item: { id, left, top, blockType, isInPalette },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }))

  const handleConnectorMouseDown = (e, isInput, connectorName) => {
    e.stopPropagation()
    onConnect && onConnect(id, isInput, connectorName)
  }

  const style = {
    left: left,
    top: top,
    opacity: isDragging ? 0.5 : 1,
    cursor: "move",
    border: selected ? `2px solid ${blockInfo.color}` : "1px solid rgba(255, 255, 255, 0.1)",
    backgroundColor: `${blockInfo.color}22`, // Using hex with alpha
  }

  return (
    <div
      ref={drag}
      className={`block ${isInPalette ? "palette-block" : "canvas-block"} ${selected ? "selected" : ""}`}
      style={style}
      onClick={(e) => {
        e.stopPropagation()
        onClick && onClick(id)
      }}
    >
      <div className="block-header" style={{ backgroundColor: blockInfo.color }}>

        <div className="block-title">{blockInfo.name}</div>
      </div>
      <div className="block-body">
        <p className="block-description">{blockInfo.description}</p>

        {!isInPalette && (
          <>
            <div className="block-connectors inputs">
              {blockInfo.inputs.map((input) => (
                <div
                  key={`input-${input}`}
                  className="connector input"
                  onMouseDown={(e) => handleConnectorMouseDown(e, true, input)}
                >
                  <div className="connector-dot"></div>
                  <span className="connector-label">{input}</span>
                </div>
              ))}
            </div>
            <div className="block-connectors outputs">
              {blockInfo.outputs.map((output) => (
                <div
                  key={`output-${output}`}
                  className="connector output"
                  onMouseDown={(e) => handleConnectorMouseDown(e, false, output)}
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

// Connection line between blocks
const Connection = ({ start, end, onDelete }) => {
  // Calculate the path for the connection
  const dx = end.x - start.x
  const dy = end.y - start.y
  const controlPointX = start.x + dx * 0.5
  const controlPointY = start.y + dy * 0.5

  return (
    <g className="connection">
      <path
        d={`M ${start.x},${start.y} Q ${controlPointX},${controlPointY} ${end.x},${end.y}`}
        stroke="var(--figma-color)"
        strokeWidth="2"
        fill="none"
      />
      <circle
        cx={controlPointX}
        cy={controlPointY}
        r="5"
        fill="var(--figma-color)"
        stroke="none"
        className="connection-delete"
        onClick={onDelete}
      />
    </g>
  )
}

// main workspace component, grtid to drag and drop selected features
const Workspace = () => {
  const [blocks, setBlocks] = useState([])
  const [connections, setConnections] = useState([])
  const [connectingFrom, setConnectingFrom] = useState(null)
  const [connectingTo, setConnectingTo] = useState({ x: 0, y: 0 })
  const [isConnecting, setIsConnecting] = useState(false)
  const [selectedBlock, setSelectedBlock] = useState(null)
  const [isPanelOpen, setIsPanelOpen] = useState(true)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  // handle dropping blocks onto the canvas
  const [, drop] = useDrop(() => ({
    accept: "block",
    drop: (item, monitor) => {
      const delta = monitor.getDifferenceFromInitialOffset()

      if (item.isInPalette) {
        // create a new block when dropping from palette
        const newBlock = {
          id: uuidv4(),
          blockType: item.blockType,
          left: monitor.getClientOffset().x - 100,
          top: monitor.getClientOffset().y - 50,
        }
        setBlocks((blocks) => [...blocks, newBlock])
      } else {
        
        // Move existing block
        const left = Math.round(item.left + delta.x)
        const top = Math.round(item.top + delta.y)

        setBlocks((blocks) => blocks.map((block) => (block.id === item.id ? { ...block, left, top } : block)))

        
        // Update connections

        setConnections((connections) =>
          // adjus thtis to have smoother drag and drop 
          connections.map((conn) => {
            if (conn.fromId === item.id) {
              return {
                ...conn,
                start: { ...conn.start, x: left + 200, y: top + 50 },
              }
            }
            if (conn.toId === item.id) {
              return {
                ...conn,
                end: { ...conn.end, x: left, y: top + 50 },
              }
            }
            return conn
          }),
        )
      }
      return undefined
    },
  }))

  // handle mouse move for drawing connections
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isConnecting) {
        setConnectingTo({ x: e.clientX, y: e.clientY })
      }
    }

    const handleMouseUp = () => {
      if (isConnecting) {
        setIsConnecting(false)
      }
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isConnecting])

  // handle starting a connection
  const handleStartConnection = (blockId, isInput, connectorName) => {
    const block = blocks.find((b) => b.id === blockId)
    if (!block) return

    const x = isInput ? block.left : block.left + 200
    const y = block.top + 50

    setConnectingFrom({
      blockId,
      isInput,
      connectorName,
      x,
      y,
    })

    setIsConnecting(true)
  }

  // handle completing a connection
  const handleCompleteConnection = (blockId, isInput, connectorName) => {
    if (!connectingFrom || connectingFrom.blockId === blockId || connectingFrom.isInput === isInput) {
      setIsConnecting(false)
      return
    }

    const fromBlock = blocks.find((b) => b.id === connectingFrom.blockId)
    const toBlock = blocks.find((b) => b.id === blockId)

    if (!fromBlock || !toBlock) {
      setIsConnecting(false)
      return
    }

    // determine which is the source and which is the target
    let sourceId, targetId, sourceX, sourceY, targetX, targetY, sourceConnector, targetConnector

    if (connectingFrom.isInput) {
      sourceId = blockId
      targetId = connectingFrom.blockId
      sourceConnector = connectorName
      targetConnector = connectingFrom.connectorName
      sourceX = toBlock.left + 200
      sourceY = toBlock.top + 50
      targetX = fromBlock.left
      targetY = fromBlock.top + 50
    } else {
      sourceId = connectingFrom.blockId
      targetId = blockId
      sourceConnector = connectingFrom.connectorName
      targetConnector = connectorName
      sourceX = fromBlock.left + 200
      sourceY = fromBlock.top + 50
      targetX = toBlock.left
      targetY = toBlock.top + 50
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
      setConnections([
        ...connections,
        {
          id: uuidv4(),
          fromId: sourceId,
          toId: targetId,
          fromConnector: sourceConnector,
          toConnector: targetConnector,
          start: { x: sourceX, y: sourceY },
          end: { x: targetX, y: targetY },
        },
      ])
    }

    setIsConnecting(false)
  }

  // handle deleting a connection
  const handleDeleteConnection = (connectionId) => {
    setConnections(connections.filter((conn) => conn.id !== connectionId))
  }

  // handle canvas mouse events for panning
  const handleCanvasMouseDown = (e) => {
    if (e.button === 0 && !isConnecting) {
      // left mouse button
      setSelectedBlock(null)
      if (e.target.classList.contains("canvas")) {
        setIsDraggingCanvas(true)
        setDragStart({ x: e.clientX, y: e.clientY })
      }
    }
  }

  const handleCanvasMouseMove = (e) => {
    if (isDraggingCanvas) {
      const dx = e.clientX - dragStart.x
      const dy = e.clientY - dragStart.y
      setPan({ x: pan.x + dx, y: pan.y + dy })
      setDragStart({ x: e.clientX, y: e.clientY })
    }
  }

  const handleCanvasMouseUp = () => {
    setIsDraggingCanvas(false)
  }

  // handle zooming with mouse wheel
  const handleWheel = (e) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    setZoom(Math.max(0.5, Math.min(2, zoom + delta)))
  }

  // handle block selection
  const handleBlockClick = (blockId) => {
    setSelectedBlock(blockId)
  }

  // handle deleting selected block
  const handleDeleteBlock = () => {
    if (selectedBlock) {
      setBlocks(blocks.filter((block) => block.id !== selectedBlock))
      setConnections(connections.filter((conn) => conn.fromId !== selectedBlock && conn.toId !== selectedBlock))
      setSelectedBlock(null)
    }
  }

  // handle saving the AVS configuration
  const handleSaveAVS = () => {
    const avsConfig = {
      blocks,
      connections,
    }
    console.log("Saving AVS configuration:", avsConfig)
    // BACKEND IMPORTANT ------->>>>>>> AVS config will contain the transmitted info for the backend 
    alert("AVS configuration saved!")
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
            <Block key={type} id={`palette-${type}`} blockType={type} left={0} top={0} isInPalette={true} />
          ))}
        </div>
        <div className="sidebar-footer">
          <button className="action-button save-button" onClick={handleSaveAVS}>
            Build AVS
          </button>
        </div>
      </div>

      <div className="canvas-container" onWheel={handleWheel}>
        <div className="canvas-controls">
          <button onClick={() => setZoom(Math.min(2, zoom + 0.1))}>+</button>
          <span>{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}>-</button>
          {selectedBlock && (
            <button className="delete-button" onClick={handleDeleteBlock}>
              🗑️
            </button>
          )}
        </div>

        <div
          ref={drop}
          className="canvas"
          style={{
            transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
            cursor: isDraggingCanvas ? "grabbing" : "default",
          }}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
        >
          <svg className="connections-layer">
            {connections.map((conn) => (
              <Connection
                key={conn.id}
                start={conn.start}
                end={conn.end}
                onDelete={() => handleDeleteConnection(conn.id)}
              />
            ))}
            {isConnecting && (
              <path
                d={`M ${connectingFrom.x},${connectingFrom.y} L ${connectingTo.x},${connectingTo.y}`}
                stroke="var(--figma-color)"
                strokeWidth="2"
                strokeDasharray="5,5"
                fill="none"
              />
            )}
          </svg>

          {blocks.map((block) => (
            <Block
              key={block.id}
              id={block.id}
              left={block.left}
              top={block.top}
              blockType={block.blockType}
              isInPalette={false}
              onConnect={isConnecting ? handleCompleteConnection : handleStartConnection}
              selected={selectedBlock === block.id}
              onClick={handleBlockClick}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// main component display
const DragAndDropAVS = () => {
  return (
    <div className="drag-and-drop-avs">
      <Header />
      <DndProvider backend={HTML5Backend}>
        <Workspace />
      </DndProvider>
    </div>
  )
}

export default DragAndDropAVS

