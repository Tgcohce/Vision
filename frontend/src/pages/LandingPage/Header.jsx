"use client"

import { useState, useEffect } from "react"
import { Link, useLocation } from "react-router-dom"
import "./header.css"
import Group1 from "../../images/Group1.png"

const Header = () => {
  const [isActive, setActive] = useState(false)
  const location = useLocation()

  //  menu closing based off route select
  useEffect(() => {
    setActive(false)
    document.body.classList.remove("ovhidden")
  }, [])
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isActive && !event.target.closest(".site__header")) {
        setActive(false)
        document.body.classList.remove("ovhidden")
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isActive])

  const handleToggle = () => {
    setActive(!isActive)
    document.body.classList.toggle("ovhidden")
  }

  return (
    <>
      <header className="fixed-top site__header">
        <div className="d-flex align-items-center justify-content-between">
          <Link className="navbar-brand nav_ac" to="/">
            <img src={Group1 || "/placeholder.svg"} alt="Logo" className="header-logo" />
          </Link>
          <div className="d-flex align-items-center menu-button-container">
            <button className="menu__button nav_ac" onClick={handleToggle}>
              {isActive ? "✕" : "☰"}
            </button>
          </div>
        </div>

        <div className={`site__navigation ${!isActive ? "" : "menu__opend"}`}>
          <div className="bg__menu h-100">
            <div className="menu__wrapper">
              <div className="menu__container p-3">
                <ul className="the_menu">
                  <li className="menu_item">
                    <Link onClick={handleToggle} to="/" className="my-3">
                      Home
                    </Link>
                  </li>
                  <li className="menu_item">
                    <Link onClick={handleToggle} to="/avs-creator" className="my-3">
                      Build
                    </Link>
                  </li>
                  <li className="menu_item">
                    <Link onClick={handleToggle} to="/faq" className="my-3">
                      FAQ
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </header>
      <div className="br-top"></div>
      <div className="br-bottom"></div>
      <div className="br-left"></div>
      <div className="br-right"></div>
    </>
  )
}

export default Header

