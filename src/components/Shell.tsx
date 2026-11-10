import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { CreditCard, FileText, LayoutDashboard, LogOut, User, Users } from 'lucide-react'
import { pode } from '../lib/regras'
import { PAPEIS } from '../lib/types'
import { useAuth } from '../state/AuthContext'

export function Shell({ children }: { children: ReactNode }) {
  const { perfil, demo, sair, trocarPapelDemo } = useAuth()
  if (!perfil) return null
  const papel = perfil.papel

  const itens = [
    { para: '/', rotulo: 'Painel', Icone: LayoutDashboard, ver: true },
    { para: '/orcamentos', rotulo: 'Orçamentos', Icone: FileText, ver: true },
    { para: '/formas', rotulo: 'Formas de pagamento', Icone: CreditCard, ver: pode.administrar(papel) },
    { para: '/usuarios', rotulo: 'Usuários', Icone: Users, ver: pode.administrar(papel) },
    { para: '/perfil', rotulo: 'Meu perfil', Icone: User, ver: true },
  ]

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <b>
            Vital <span>Financeiro</span>
          </b>
          <span className="label-up">Esquadrias e Vidros</span>
        </div>
        <nav className="nav">
          {itens
            .filter((i) => i.ver)
            .map(({ para, rotulo, Icone }) => (
              <NavLink key={para} to={para} end={para === '/'} className={({ isActive }) => `nav-btn ${isActive ? 'on' : ''}`}>
                <Icone size={18} strokeWidth={1.5} />
                {rotulo}
              </NavLink>
            ))}
        </nav>
        {demo && (
          <div className="demo-bar">
            <span>Modo demonstração: nada é gravado. Ver como:</span>
            <div className="row" style={{ gap: 6 }}>
              {PAPEIS.map((p) => (
                <button key={p} type="button" className={`chip ${papel === p ? 'on' : ''}`} onClick={() => trocarPapelDemo(p)}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="sidebar-foot">
          <div>
            <div className="ellipsis" style={{ fontWeight: 500 }}>
              {perfil.nome}
            </div>
            <div className="label-up">{papel}</div>
          </div>
          <button type="button" className="btn-link" onClick={() => void sair()}>
            <LogOut size={15} strokeWidth={1.5} />
            Sair
          </button>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  )
}
