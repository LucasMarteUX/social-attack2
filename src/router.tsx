import { createBrowserRouter } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import AuthGuard from './components/layout/AuthGuard'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import CategoriasPage from './pages/CategoriasPage'
import BibliotecaPage from './pages/BibliotecaPage'
import CriativosPage from './pages/CriativosPage'
import CriativoNovoPage from './pages/CriativoNovoPage'
import CriativoDetailPage from './pages/CriativoDetailPage'
import AgendaPage from './pages/AgendaPage'
import TodosPage from './pages/TodosPage'
import TomDeVozPage from './pages/TomDeVozPage'
import WorkspacesPage from './pages/WorkspacesPage'
import WorkspacePage from './pages/WorkspacePage'
import DesignSystemsPage from './pages/DesignSystemsPage'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: <AuthGuard />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <HomePage /> },
          { path: 'categorias', element: <CategoriasPage /> },
          { path: 'categorias/:id/ideias', element: <BibliotecaPage /> },
          { path: 'criativos', element: <CriativosPage /> },
          { path: 'criativos/novo', element: <CriativoNovoPage /> },
          { path: 'criativos/:id', element: <CriativoDetailPage /> },
          { path: 'workspace', element: <WorkspacesPage /> },
          { path: 'workspace/novo', element: <WorkspacePage /> },
          { path: 'workspace/:id', element: <WorkspacePage /> },
          { path: 'design-systems', element: <DesignSystemsPage /> },
          { path: 'tom-de-voz', element: <TomDeVozPage /> },
          { path: 'agenda', element: <AgendaPage /> },
          { path: 'todos', element: <TodosPage /> },
        ],
      },
    ],
  },
])
