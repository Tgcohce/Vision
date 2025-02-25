import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';

function TypewriterText({
  text = '',
  typeSpeed = 200,  
   // typing speed 
  eraseSpeed = 100, 
   // erasing speed 
  pause = 4000    
     // pause ms based pause before state switch
}) {
  const [displayedText, setDisplayedText] = useState('');
  const [phase, setPhase] = useState('typing');
   // typing or erasing states
  const [index, setIndex] = useState(0);  

  useEffect(() => {
    let intervalId;

    if (phase === 'typing') {
      // Type forward, one character at a time
      intervalId = setInterval(() => {
        setDisplayedText((prev) => text.slice(0, prev.length + 1));
        setIndex((prevIndex) => {
          // typed all chars, switches to erasing state after a pause, set to repeat 
          if (prevIndex + 1 === text.length) {
            clearInterval(intervalId);
            setTimeout(() => setPhase('erasing'), pause);
          }
          return prevIndex + 1;
        });
      }, typeSpeed);
    } else if (phase === 'erasing') {
      // backwards erasing logic 
      intervalId = setInterval(() => {
        setDisplayedText((prev) => prev.slice(0, -1));
        setIndex((prevIndex) => {
          // if erased everything, stops set for repetitive loop
          if (prevIndex - 1 <= 0) {
            clearInterval(intervalId);
          }
          return prevIndex - 1;
        });
      }, eraseSpeed);
    }

    return () => clearInterval(intervalId);
  }, [phase, text, typeSpeed, eraseSpeed, pause]);

  return <>{displayedText}</>;
}

function LandingPage() {
  return (
    <div className="landing-page">
      {/* left side for the Title & typewriter subtitle */}
      <div className="landing-page__content">
        <h1 className="landing-page__title">Vision.</h1>
        <p className="landing-page__subtitle">
          <TypewriterText
            text="Drag.   Drop.   Deploy."
            typeSpeed={200}
            eraseSpeed={100}
            pause={1000}
          />
        </p>
      </div>

      {/* hoveer animated button component */}
      <div className="landing-page__action">
        <Link to="/avs-creator" className="ac_btn">
          Start Building
          <div className="ring one"></div>
          <div className="ring two"></div>
          <div className="ring three"></div>
        </Link>
      </div>
    </div>
  );
}

export default LandingPage;
