import { useDrag } from "react-dnd"

const Block = ({ id, left, top, blockType, blockInfo, isInPalette, onConnect, selected, onClick }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "block",
    item: { id, left, top, blockType, isInPalette },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    // Add this to fix the drag offset
    options: {
      dropEffect: "move",
    },
    // Fix the drag offset by getting the initial cursor position
    previewOptions: {
      anchorX: 0,
      anchorY: 0,
    },
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
    backgroundColor: `${blockInfo.color}22`,
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

export default Block

