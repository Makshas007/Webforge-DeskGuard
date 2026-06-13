import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import MapView from './MapView';
import SessionView from './SessionView';
import LibrarianView from './LibrarianView';
import './App.css';

function NavBar() {
  const location = useLocation();

  return (
    <header className="app-header">
      <Link to="/" className="app-logo" style={{ textDecoration: 'none' }}>
        <span className="logo-icon">🛡️</span>
        <h1 className="logo-text">DeskGuard</h1>
      </Link>
      <nav className="app-nav">
        <Link
          to="/"
          className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
        >
          📍 Library Map
        </Link>
        <Link
          to="/librarian"
          className={`nav-link ${location.pathname === '/librarian' ? 'active' : ''}`}
        >
          🔑 Librarian
        </Link>
      </nav>
    </header>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <NavBar />
        <main className="page-container">
          <Routes>
            <Route path="/" element={<MapView />} />
            <Route path="/session/:token" element={<SessionView />} />
            <Route path="/session/checkin/:deskId" element={<SessionView />} />
            <Route path="/librarian" element={<LibrarianView />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
