import React, { useState } from 'react';
import './DragAndDropAVS.css';

function DragAndDropAVS() {
  const [elements, setElements] = useState([]);

  //  placeholder, drag logic built in personal repo using same sort of feature 
  const handleAddElement = () => {
    setElements((prev) => [...prev, `Element #${prev.length + 1}`]);
  };

  return (
    <div className="avs-creator">
      <h2>Drag &amp; Drop AVS Creator</h2>
      <button onClick={handleAddElement}>Add an Element</button>

      <div className="avs-creator__canvas">
        {elements.map((el, idx) => (
          <div key={idx} className="avs-creator__element">
            {el}
          </div>
        ))}
      </div>
    </div>
  );
}

export default DragAndDropAVS;
