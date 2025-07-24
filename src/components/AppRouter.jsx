import React from 'react';
import { BrowserRouter as Router, Route, Routes, NavLink } from 'react-router-dom';
import Home from '../pages/Home';
import Jimbo from '../pages/Jimbo';
import Casino from '../pages/Casino';
import Settings from '../pages/Settings';
import '../styles/navigation.css';

function AppRouter({ players, setPlayers, potMoney, setPotMoney }) {
  return (
    <Router basename="/babapoly/">
      <div className="app-container">
        <Routes>
          <Route path="/" element={<Home players={players} setPlayers={setPlayers} potMoney={potMoney} setPotMoney={setPotMoney} />} />
          <Route path="/jimbo" element={<Jimbo />} />
          <Route path="/casino" element={<Casino />} />
          <Route path="/settings" element={<Settings players={players} setPlayers={setPlayers} setPotMoney={setPotMoney} />} />
        </Routes>

        <nav className="bottom-navigation">
          <NavLink to="/" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            {/* Icono de Inicio */}
            <span>Inicio</span>
          </NavLink>
          <NavLink to="/jimbo" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            {/* Icono de Jimbo */}
            <span>Jimbo</span>
          </NavLink>
          <NavLink to="/casino" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            {/* Icono de Casino */}
            <span>Casino</span>
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            {/* Icono de Ajustes */}
            <span>Ajustes</span>
          </NavLink>
        </nav>
      </div>
    </Router>
  );
}

export default AppRouter;