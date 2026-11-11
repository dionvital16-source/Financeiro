import { useState } from 'react'
import { Copy, MessageCircle, RefreshCw, Send, X } from 'lucide-react'
import { linkAssinatura, linkWhatsapp } from '../lib/assinatura'
import { fmtData, hojeISO } from '../lib/dates'
import type { Assinatura, Orcamento } from '../lib/types'
import { useAuth } from '../state/AuthContext'
import { useDados } from '../state/DataContext'
import { useToast } from '../state/ToastContext'
import { Confirmar, Selo } from './ui'

/** Envio do pedido para o cliente assinar pelo link (fica dentro do quadro "Pedido assinado"). */
export function AssinaturaPedido({ orcamento }: { orcamento: Orcamento }) {
  const { assinaturas, enviarParaAssinatura, novoLinkAssinatura, gravar, recarregar } = useDados()
  const { perfil } = useAuth()
  const { avisar, avisarErro } = useToast()
  // O código do link só existe na hora em que é criado; depois o banco guarda apenas o hash dele.
  const [links, setLinks] = useState<Record<string, string>>({})
  const [ocupado, setOcupado] = useState(false)
  const [cancelar, setCancelar] = useState<Assinatura | null>(null)

  const hoje = hojeISO()
  const pendentes = assinaturas.filter((a) => a.orcamento_id === orcamento.id && a.status === 'aguardando')
  const concluidas = assinaturas.filter((a) => a.orcamento_id === orcamento.id && a.status === 'assinado')

  async function executar(acao: () => Promise<void>) {
    setOcupado(true)
    try {
      await acao()
    } catch (e) {
      avisarErro(e)
    } finally {
      setOcupado(false)
    }
  }

  const enviar = (arquivo: File | undefined) =>
    arquivo &&
    executar(async () => {
      const { assinatura, token } = await enviarParaAssinatura(orcamento.id, arquivo)
      setLinks((l) => ({ ...l, [assinatura.id]: token }))
      avisar('Pedido assinado pela Vital. Agora envie o link para o cliente.')
    })

  const renovar = (a: Assinatura) =>
    executar(async () => {
      const token = await novoLinkAssinatura(a)
      setLinks((l) => ({ ...l, [a.id]: token }))
      avisar('Link novo gerado. O link anterior deixou de valer.')
    })

  function mensagem(token: string): string {
    const primeiro = orcamento.cliente.trim().split(' ')[0]
    return (
      `Olá, ${primeiro}! Aqui é ${perfil?.nome ?? 'a equipe'} da Vital Esquadrias e Vidros.\n` +
      `Segue o link para você conferir e assinar o pedido ${orcamento.codigo}:\n${linkAssinatura(token)}\n` +
      `O link é pessoal e vale por 7 dias.`
    )
  }

  async function copiar(token: string) {
    try {
      await navigator.clipboard.writeText(linkAssinatura(token))
      avisar('Link copiado.')
    } catch {
      avisar('Não foi possível copiar. Selecione o link e copie à mão.')
    }
  }

  return (
    <div className="col" style={{ gap: 12, marginBottom: 16 }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="muted" style={{ fontSize: 13.5, flex: '1 1 260px' }}>
          Ainda não tem a assinatura do cliente? Envie o PDF do pedido: a Vital assina na hora e o cliente assina pelo celular.
        </span>
        <label className={`btn btn-secondary ${ocupado ? 'ocupado' : ''}`}>
          <Send size={16} strokeWidth={1.5} />
          Enviar para assinatura
          <input
            type="file"
            accept="application/pdf,.pdf"
            hidden
            disabled={ocupado}
            onChange={(e) => {
              void enviar(e.target.files?.[0])
              e.target.value = ''
            }}
          />
        </label>
      </div>

      {pendentes.map((a) => {
        const token = links[a.id]
        const vencido = a.expira_em.slice(0, 10) < hoje
        return (
          <div key={a.id} className="envio-assinatura">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div style={{ minWidth: 0, flex: '1 1 220px' }}>
                <div className="ellipsis" style={{ fontWeight: 600 }}>
                  {a.arquivo_nome}
                </div>
                <div className="label-up">
                  Assinado pela Vital ({a.enviado_por_nome ?? '—'}) em {fmtData(a.criado_em)} · link vale até {fmtData(a.expira_em)}
                </div>
              </div>
              <Selo tom={vencido ? 'ink' : 'neutro'}>{vencido ? 'Link vencido' : 'Aguardando o cliente'}</Selo>
            </div>

            {token ? (
              <>
                <input className="input" readOnly value={linkAssinatura(token)} onFocus={(e) => e.target.select()} aria-label="Link de assinatura" />
                <div className="row">
                  <a className="btn btn-primary" href={linkWhatsapp(orcamento.cliente_fone, mensagem(token))} target="_blank" rel="noreferrer">
                    <MessageCircle size={16} strokeWidth={1.5} />
                    Enviar pelo WhatsApp
                  </a>
                  <button type="button" className="btn btn-secondary" onClick={() => void copiar(token)}>
                    <Copy size={16} strokeWidth={1.5} />
                    Copiar link
                  </button>
                  <button type="button" className="btn-link" disabled={ocupado} onClick={() => setCancelar(a)}>
                    <X size={14} strokeWidth={1.5} />
                    Cancelar envio
                  </button>
                </div>
                {!orcamento.cliente_fone && (
                  <span className="muted" style={{ fontSize: 12.5 }}>
                    Este cliente está sem telefone no cadastro: o WhatsApp vai pedir para você escolher o contato.
                  </span>
                )}
              </>
            ) : (
              <div className="row">
                <span className="muted" style={{ fontSize: 13, flex: '1 1 240px' }}>
                  Por segurança, o link só aparece na hora em que é criado. Para enviar de novo, gere um link novo (o anterior deixa de valer).
                </span>
                <button type="button" className="btn btn-secondary" disabled={ocupado} onClick={() => void renovar(a)}>
                  <RefreshCw size={16} strokeWidth={1.5} />
                  Gerar link novo
                </button>
                <button type="button" className="btn-link" disabled={ocupado} onClick={() => setCancelar(a)}>
                  <X size={14} strokeWidth={1.5} />
                  Cancelar envio
                </button>
              </div>
            )}
          </div>
        )
      })}

      {pendentes.length > 0 && (
        <button type="button" className="btn-link" style={{ alignSelf: 'flex-start' }} onClick={() => void recarregar()}>
          <RefreshCw size={14} strokeWidth={1.5} />
          Atualizar para ver se o cliente já assinou
        </button>
      )}

      {concluidas.map((a) => (
        <div key={a.id} className="label-up" style={{ textTransform: 'none', letterSpacing: 0, fontSize: 12.5 }}>
          Assinado eletronicamente por {a.assinante_nome} em {fmtData(a.assinado_em)} · código de verificação <b>{a.codigo_verificacao}</b>
        </div>
      ))}

      {cancelar && (
        <Confirmar
          titulo="Cancelar envio"
          texto={`Cancelar o envio de "${cancelar.arquivo_nome}" para assinatura? O link deixa de funcionar na hora.`}
          acao="Cancelar envio"
          ocupado={ocupado}
          onCancelar={() => setCancelar(null)}
          onConfirmar={() =>
            void executar(async () => {
              await gravar('assinaturas', { id: cancelar.id, status: 'cancelado' })
              setCancelar(null)
              avisar('Envio cancelado.')
            })
          }
        />
      )}
    </div>
  )
}
