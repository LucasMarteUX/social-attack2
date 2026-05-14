import { createBrowserRouter } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import HomePage from './pages/HomePage'
import CategoriasPage from './pages/CategoriasPage'
import BibliotecaPage from './pages/BibliotecaPage'
import CriativosPage from './pages/CriativosPage'
import CriativoNovoPage from './pages/CriativoNovoPage'
import CriativoDetailPage from './pages/CriativoDetailPage'
import AgendaPage from './pages/AgendaPage'
import TodosPage from './pages/TodosPage'
import TomDeVozPage from './pages/TomDeVozPage'
import WorkspacePage from './pages/WorkspacePage'
import DesignSystemsPage from './pages/DesignSystemsPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'categorias', element: <CategoriasPage /> },
      { path: 'categorias/:id/ideias', element: <BibliotecaPage /> },
      { path: 'criativos', element: <CriativosPage /> },
      { path: 'criativos/novo', element: <CriativoNovoPage /> },
      { path: 'criativos/:id', element: <CriativoDetailPage /> },
      { path: 'workspace', element: <WorkspacePage /> },
      { path: 'design-systems', element: <DesignSystemsPage /> },
      { path: 'tom-de-voz', element: <TomDeVozPage /> },
      { path: 'agenda', element: <AgendaPage /> },
      { path: 'todos', element: <TodosPage /> },
    ],
  },
])
