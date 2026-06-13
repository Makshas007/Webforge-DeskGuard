import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MapView from './MapView';
import LibrarianView from './LibrarianView';

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<MapView />} />
      <Route path="/librarian" element={<LibrarianView />} />
    </Routes>
  </BrowserRouter>
);
