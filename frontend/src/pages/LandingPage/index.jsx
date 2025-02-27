"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import Header from "./Header"
import "./LandingPage.css"

function TypewriterText({ text = "", typeSpeed = 200, eraseSpeed = 100, pause = 4000 }) {
  const [displayedText, setDisplayedText] = useState("")
  const [phase, setPhase] = useState("typing")
  const [index, setCursorPosition] = useState(0)

  useEffect(() => {
    let intervalId

    if (phase === "typing") {
      intervalId = setInterval(() => {
        setDisplayedText((prev) => text.slice(0, prev.length + 1))
        setCursorPosition((prevPosition) => {
          if (prevPosition + 1 === text.length) {
            clearInterval(intervalId)
            setTimeout(() => setPhase("erasing"), pause)
          }
          return prevPosition + 1
        })
      }, typeSpeed)
    } else if (phase === "erasing") {
      intervalId = setInterval(() => {
        setDisplayedText((prev) => prev.slice(0, -1))
        setCursorPosition((prevPosition) => {
          if (prevPosition - 1 <= 0) {
            clearInterval(intervalId)
            setTimeout(() => setPhase("typing"), 500)
          }
          return prevPosition - 1
        })
      }, eraseSpeed)
    }

    return () => clearInterval(intervalId)
  }, [phase, text, typeSpeed, eraseSpeed, pause])

  return <span className="typewriter-text">{displayedText}</span>
}

function LandingPage() {
  return (
    <>
      <Header />
      <div className="landing-page">
        {/*grid lines */}
        <div className="grid-lines"></div>
        <div className="diagonal-lines"></div>

        {/* wwraps the content to ensure it's above the grid */}
        <div className="content-wrapper">
          {/* left side for the Title & typewriter subtitle */}
          <div className="landing-page__content">
            <h1 className="landing-page__title">Vision.</h1>
            <div className="landing-page__subtitle">
              <TypewriterText text="Drag.   Drop.   Deploy." typeSpeed={200} eraseSpeed={100} pause={1000} />
            </div>
          </div>

          {/* hover animated button component */}
          <div className="landing-page__action">
            <Link to="/avs-creator" className="ac_btn">
              Start Building
              {/* removed the ring divs that were causing the black box finally omg*/}
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}

export default LandingPage

