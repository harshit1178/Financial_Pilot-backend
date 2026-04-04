import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import App from './App'
import Dashboard from './Dashboard'
import GoalsPage from './GoalsPage'
import GrowSavings from './GrowSavings'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />}>
          <Route index        element={<Dashboard />} />
          <Route path="goals" element={<GoalsPage />} />
          <Route path="grow"  element={<GrowSavings />} />
          <Route path="*"     element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
