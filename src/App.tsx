import type { ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Shell } from './components/Shell'
import { Carregando, Vazio } from './components/ui'
import { CONFIGURADO, DEMO, mensagemErro } from './lib/supabase'
import { pode } from './lib/regras'
import type { Papel } from './lib/types'
import { FormasPagamento } from './screens/FormasPagamento'
import { Importar } from './screens/Importar'
import { Assinar } from './screens/Assinar'
import { Aviso, Login, NovaSenha } from './screens/Login'
import { OrcamentoDetalhe } from './screens/OrcamentoDetalhe'
import { Orcamentos } from './screens/Orcamentos'
import { Painel } from './screens/Painel'
import { Perfil } from './screens/Perfil'
import { Usuarios } from './screens/Usuarios'
import { useAuth } from './state/AuthContext'
import { DataProvider, useDados } from './state/DataContext'

function So({ regra, children }: { regra: (p: Papel) => boolean; children: ReactNode }) {
  const { perfil } = useAuth()
  return perfil && regra(perfil.papel) ? <>{children}</> : <Navigate to="/" replace />
}

function Telas() {
  const { carregando, erro, recarregar } = useDados()
  if (carregando) return <Carregando />
  if (erro)
    return (
      <div className="page">
        <Vazio>
          {mensagemErro(erro)}{' '}
          <button type="button" className="btn-link" onClick={() => void recarregar()}>
            Tentar de novo
          </button>
        </Vazio>
      </div>
    )
  return (
    <Routes>
      <Route path="/" element={<Painel />} />
      <Route path="/orcamentos" element={<Orcamentos />} />
      <Route path="/orcamentos/:id" element={<OrcamentoDetalhe />} />
      <Route path="/importar" element={<So regra={pode.gerirOrcamentos}><Importar /></So>} />
      <Route path="/formas" element={<So regra={pode.administrar}><FormasPagamento /></So>} />
      <Route path="/usuarios" element={<So regra={pode.administrar}><Usuarios /></So>} />
      <Route path="/perfil" element={<Perfil />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export function App() {
  const { carregando, logado, perfil, recuperando } = useAuth()
  const { pathname } = useLocation()

  // Página pública do cliente: abre pelo link de assinatura, sem login e sem nada do sistema por trás.
  if (pathname.startsWith('/assinar/')) return <Assinar token={pathname.slice('/assinar/'.length).replace(/\/+$/, '')} />

  if (!DEMO && !CONFIGURADO)
    return <Aviso titulo="Site ainda não configurado">Falta informar o endereço e a chave pública do Supabase. Para ver as telas com dados de exemplo, abra o site com ?demo no final do endereço.</Aviso>
  if (carregando) return <Carregando />
  if (!logado) return <Login />
  if (recuperando) return <NovaSenha />
  if (!perfil)
    return (
      <Aviso titulo="Acesso não liberado" comSair>
        Sua conta está suspensa ou ainda não foi liberada. Fale com o administrador.
      </Aviso>
    )

  return (
    <DataProvider>
      <Shell>
        <Telas />
      </Shell>
    </DataProvider>
  )
}
