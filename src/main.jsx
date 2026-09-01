import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles/app-globals.css'
import App from './App'

const container = document.getElementById('root')
if (!container) {
  throw new Error('QMRF app root element #root is missing from index.html')
}

ReactDOM.createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
