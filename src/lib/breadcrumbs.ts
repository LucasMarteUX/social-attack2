export interface BreadcrumbItem {
  label: string
  to?: string
}

export function breadcrumbsFromPath(pathname: string): BreadcrumbItem[] {
  const path = pathname.replace(/\/$/, '') || '/'

  if (path === '/') {
    return [{ label: 'Social Attack', to: '/' }, { label: 'Dashboard' }]
  }

  if (path === '/workspace') {
    return [{ label: 'Workspace', to: '/workspace' }, { label: 'Spaces' }]
  }
  if (path === '/workspace/novo') {
    return [{ label: 'Workspace', to: '/workspace' }, { label: 'Novo carrossel' }]
  }
  if (/^\/workspace\/[^/]+$/.test(path)) {
    return [{ label: 'Workspace', to: '/workspace' }, { label: 'Canvas' }]
  }

  if (path === '/design-systems') {
    return [{ label: 'Nodes', to: '/design-systems' }, { label: 'Design Systems' }]
  }

  if (path === '/categorias') {
    return [{ label: 'Conteúdo', to: '/categorias' }, { label: 'Categorias' }]
  }
  if (/^\/categorias\/[^/]+\/ideias$/.test(path)) {
    return [{ label: 'Conteúdo', to: '/categorias' }, { label: 'Biblioteca de ideias' }]
  }

  if (path === '/criativos') {
    return [{ label: 'Conteúdo', to: '/criativos' }, { label: 'Criativos' }]
  }
  if (path === '/criativos/novo') {
    return [{ label: 'Conteúdo', to: '/criativos' }, { label: 'Novo criativo' }]
  }
  if (/^\/criativos\/[^/]+$/.test(path)) {
    return [{ label: 'Conteúdo', to: '/criativos' }, { label: 'Detalhe' }]
  }

  if (path === '/tom-de-voz') {
    return [{ label: 'Conteúdo', to: '/tom-de-voz' }, { label: 'Tom de voz' }]
  }

  if (path === '/agenda') {
    return [{ label: 'Planejamento', to: '/agenda' }, { label: 'Agenda' }]
  }
  if (path === '/todos') {
    return [{ label: 'Planejamento', to: '/todos' }, { label: 'To-do' }]
  }

  return [{ label: 'Social Attack', to: '/' }, { label: 'Página' }]
}
