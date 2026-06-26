import React from 'react'
import ReactDOM from 'react-dom/client'
import axios from 'axios'
import App from './App.jsx'
import './index.css'

// Sertakan JWT token secara automatik dalam setiap permintaan axios
axios.interceptors.request.use(config => {
  const token = localStorage.getItem('authToken')
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`
  }
  return config
})

// Redirect ke login jika token tamat tempoh (401) atau akses ditolak (403)
axios.interceptors.response.use(
  response => response,
  error => {
    const requestUrl = error.config?.url || ''
    const status = error.response?.status
    const isAuthError = status === 401 || status === 403
    const isLoginEndpoint = requestUrl.includes('/api/login')

    if (isAuthError && !isLoginEndpoint) {
      const path = window.location.pathname
      localStorage.removeItem('authToken')
      if (path.startsWith('/staf')) {
        localStorage.removeItem('staffUser')
        window.location.href = '/staf/login'
      } else {
        localStorage.removeItem('user')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
