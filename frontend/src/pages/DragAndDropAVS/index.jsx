"use client"

import { useState, useEffect } from "react"
import { DndProvider } from "react-dnd"
import { HTML5Backend } from "react-dnd-html5-backend"
import Header from "../LandingPage/Header"
import Workspace from "./components/Workspace"
import "./DragAndDropAVS.css"

// Main component for the AVS builder
const DragAndDropAVS = () => {
  // Enable touch backend for mobile if detected
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

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