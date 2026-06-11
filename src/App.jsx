import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Detail from './pages/Detail.jsx'
import Add from './pages/Add.jsx'
import Settings from './pages/Settings.jsx'
import Nav from './components/Nav.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/detail" element={<Detail />} />
        <Route path="/add" element={<Add />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <Nav />
    </BrowserRouter>
  )
}
