import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { Toaster } from 'react-hot-toast'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          zIndex: 2147483647,
        },
        duration: 4000,
      }}
    />
  </React.StrictMode>,
)

// Add error handling for browser extension errors
window.addEventListener('error', (event) => {
  // Suppress errors from browser extensions
  if (event.message && event.message.includes('message channel closed')) {
    event.preventDefault();
    return false;
  }
});

window.addEventListener('unhandledrejection', (event) => {
  // Suppress promise rejections from browser extensions
  if (event.reason && typeof event.reason === 'string' && event.reason.includes('message channel closed')) {
    event.preventDefault();
    return false;
  }
});
