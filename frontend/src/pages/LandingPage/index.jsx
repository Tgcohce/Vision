"use client"

import { useState, useEffect, useRef } from "react"
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

const FAQ_DATA = [
  {
    question: "What is an AVS Builder?",
    answer:
      "AVS Builder is a powerful tool that allows you to create and configure Actively Validated Services through an intuitive drag-and-drop interface. It simplifies the complex process of building blockchain services by providing visual components that can be easily connected and configured.",
  },
  {
    question: "How do I get started?",
    answer:
      "Getting started is simple! Click the 'Start Building' button above to access our visual builder. From there, you can drag components from the sidebar onto the canvas and connect them to create your service flow. No deep technical knowledge required.",
  },
  {
    question: "What components are available?",
    answer:
      "We offer a variety of components including Validators, Storage, Compute nodes, Oracles, and Smart Contracts. Each component serves a specific purpose in your service architecture and can be customized to meet your needs.",
  },
  {
    question: "Can I save my progress?",
    answer:
      "Yes! Your work is automatically saved as you build. You can also export your configuration at any time to share or deploy it later. We ensure your work is never lost.",
  },
]

function LandingPage() {
  const faqRef = useRef(null)
  const [activeQuestion, setActiveQuestion] = useState(null)

  const scrollToFAQ = () => {
    faqRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <>
      <Header />
      <div className="landing-page">
        <div className="grid-lines"></div>
        <div className="diagonal-lines"></div>

        <div className="content-wrapper">
          <div className="landing-page__content">
            <h1 className="landing-page__title">Vision.</h1>
            <div className="landing-page__subtitle">
              <TypewriterText text="Drag.   Drop.   Deploy." typeSpeed={200} eraseSpeed={100} pause={1000} />
            </div>
          </div>

          <div className="landing-page__action">
            <Link to="/avs-creator" className="ac_btn">
              Start Building
            </Link>
            <button onClick={scrollToFAQ} className="learn-more-btn">
              Learn More ↓
            </button>
          </div>
        </div>
      </div>

      <div ref={faqRef} className="faq-section">
        <div className="grid-lines"></div>
        <div className="diagonal-lines"></div>

        <div className="faq-content">
          <h2 className="faq-title">Frequently Asked Questions</h2>

          <div className="faq-container">
            {FAQ_DATA.map((faq, index) => (
              <div
                key={index}
                className={`faq-card ${activeQuestion === index ? "active" : ""}`}
                onClick={() => setActiveQuestion(activeQuestion === index ? null : index)}
              >
                <div className="faq-card-inner">
                  <div className="faq-question">
                    <h3>{faq.question}</h3>
                    <div className="faq-icon">
                      <span className="faq-icon-line horizontal"></span>
                      <span className={`faq-icon-line vertical ${activeQuestion === index ? "hidden" : ""}`}></span>
                    </div>
                  </div>
                  <div className="faq-answer">
                    <p>{faq.answer}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

export default LandingPage