import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './App'
import Annotate from './pages/Annotate'
import './styles/tailwind.css'

const router = createBrowserRouter([
  { path: '/', element: <App /> },
  { path: '/annotate/:draftId', element: <Annotate /> },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
)
