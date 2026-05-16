import React from 'react'
import ReactDOM from 'react-dom/client'
import { ConvexProvider, ConvexReactClient } from 'convex/react'
import App from './App'

const convexUrl = import.meta.env.VITE_CONVEX_URL || 'https://giddy-dragon-7.convex.cloud'
const convex = new ConvexReactClient(convexUrl)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConvexProvider client={convex}>
      <App />
    </ConvexProvider>
  </React.StrictMode>,
)
