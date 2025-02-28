import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import LandingPage from "./pages/LandingPage"
import DragAndDropAVS from "./pages/DragAndDropAVS"
import DeployPage from "./pages/DeployPage"
import "./App.css"

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/avs-creator" element={<DragAndDropAVS />} />
          <Route path="/deploy" element={<DeployPage />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App