// Monta o PDF final: o pedido original + a página do Termo de assinatura eletrônica.
// Não depende de nada do servidor: recebe a biblioteca pdf-lib por parâmetro,
// para poder ser testado fora do Supabase.

export interface DadosTermo {
  codigo: string
  cliente: string
  arquivoNome: string
  hashOriginal: string
  verificacao: string
  vitalPor: string
  vitalEm: string
  assinanteNome: string
  assinanteDoc: string
  assinadoEm: string
  ip: string
  /** sem o logo (se o site estiver fora do ar na hora), o termo sai com o nome da empresa em texto */
  logoPng: Uint8Array | null
  assinaturaPng: Uint8Array
}

const VERDE = [0, 150 / 255, 53 / 255]
const VERDE_ESCURO = [0, 73 / 255, 30 / 255]
const TINTA = [29 / 255, 31 / 255, 32 / 255]
const CINZA = [117 / 255, 117 / 255, 117 / 255]
const LINHA = [0.82, 0.84, 0.82]

/** As fontes padrão do PDF só conhecem letras latinas: tira o que não couber. */
export function limpo(s: string, max = 200): string {
  return Array.from(s ?? '')
    .filter((ch) => {
      const c = ch.charCodeAt(0)
      return ch.length === 1 && ((c >= 32 && c <= 126) || (c >= 160 && c <= 255))
    })
    .join('')
    .trim()
    .slice(0, max)
}

// deno-lint-ignore no-explicit-any
export async function montarPdf(lib: any, original: Uint8Array | null, d: DadosTermo): Promise<{ bytes: Uint8Array; comOriginal: boolean }> {
  const { PDFDocument, StandardFonts, rgb } = lib
  const cor = (c: number[]) => rgb(c[0], c[1], c[2])

  // deno-lint-ignore no-explicit-any
  let doc: any = null
  let comOriginal = false
  if (original) {
    try {
      doc = await PDFDocument.load(original)
      comOriginal = true
    } catch {
      doc = null // PDF protegido ou fora do padrão: o termo sai sozinho, citando o arquivo pelo código
    }
  }
  if (!doc) doc = await PDFDocument.create()

  const normal = await doc.embedFont(StandardFonts.Helvetica)
  const negrito = await doc.embedFont(StandardFonts.HelveticaBold)
  const logo = d.logoPng ? await doc.embedPng(d.logoPng) : null
  const rubrica = await doc.embedPng(d.assinaturaPng)

  // rodapé discreto em cada página do pedido, ligando-a ao termo
  if (comOriginal) {
    for (const pg of doc.getPages()) {
      const { width } = pg.getSize()
      const txt = limpo(`Assinado eletronicamente - Vital Esquadrias e Vidros - verificação ${d.verificacao}`)
      pg.drawText(txt, { x: Math.max(12, (width - normal.widthOfTextAtSize(txt, 6.5)) / 2), y: 8, size: 6.5, font: normal, color: cor(CINZA) })
    }
  }

  const W = 595.28
  const H = 841.89
  const M = 48
  const pg = doc.addPage([W, H])
  // deno-lint-ignore no-explicit-any
  const txt = (s: string, x: number, y: number, o: any = {}) =>
    pg.drawText(limpo(s, o.max ?? 200), { x, y, size: o.size ?? 10, font: o.bold ? negrito : normal, color: cor(o.cor ?? TINTA) })
  const marca = (x: number, y: number) =>
    pg.drawSvgPath('M 3 0 L 8 0 L 5 12 L 0 12 Z', { x, y: y + 11, color: cor(VERDE) })

  // faixa verde do topo e logo
  pg.drawRectangle({ x: 0, y: H - 9, width: W, height: 9, color: cor(VERDE) })
  const lw = 150
  const lh = logo ? (logo.height / logo.width) * lw : 46
  if (logo) pg.drawImage(logo, { x: M, y: H - 34 - lh, width: lw, height: lh })
  else txt('VITAL ESQUADRIAS E VIDROS', M, H - 62, { size: 15, bold: true, cor: VERDE })
  txt('FINANCEIRO', M, H - 46 - lh, { size: 7.5, bold: true, cor: VERDE })

  let y = H - 122
  txt('TERMO DE ASSINATURA ELETRÔNICA', M, y, { size: 17, bold: true, cor: VERDE })
  y -= 17
  txt('Este termo faz parte do pedido identificado abaixo e registra as assinaturas eletrônicas das partes.', M, y, { size: 9, cor: CINZA })

  // dados do documento
  y -= 34
  marca(M, y - 2)
  txt('DOCUMENTO', M + 13, y, { size: 10, bold: true })
  y -= 8
  pg.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.6, color: cor(LINHA) })
  const linha = (rotulo: string, valor: string, tamanho = 10) => {
    y -= 17
    txt(rotulo.toUpperCase(), M, y + 1, { size: 7, bold: true, cor: CINZA })
    txt(valor, M + 104, y, { size: tamanho, max: 90 })
  }
  linha('Pedido / obra', d.codigo)
  linha('Cliente', d.cliente)
  linha('Arquivo', d.arquivoNome)
  linha('Impressão digital', d.hashOriginal, 7.5)
  y -= 11
  txt('(código SHA-256 do arquivo original: qualquer alteração no PDF muda este código)', M + 104, y, { size: 7, cor: CINZA })

  // quadro de assinatura
  const quadro = (titulo: string, yTopo: number, altura: number) => {
    marca(M, yTopo - 2)
    txt(titulo, M + 13, yTopo, { size: 10, bold: true })
    const top = yTopo - 9
    pg.drawRectangle({ x: M, y: top - altura, width: W - 2 * M, height: altura, borderColor: cor(LINHA), borderWidth: 0.8 })
    pg.drawRectangle({ x: M, y: top - altura, width: 4, height: altura, color: cor(VERDE) })
    return top
  }

  // --- Vital
  y -= 36
  let top = quadro('CONTRATADA', y, 104)
  const vw = 168
  const vh = logo ? (logo.height / logo.width) * vw : 51
  if (logo) pg.drawImage(logo, { x: M + 22, y: top - 18 - vh, width: vw, height: vh })
  else txt('VITAL', M + 22, top - 56, { size: 30, bold: true, cor: VERDE })
  pg.drawLine({ start: { x: M + 22, y: top - 26 - vh }, end: { x: M + 22 + vw + 20, y: top - 26 - vh }, thickness: 0.7, color: cor(TINTA) })
  txt('Vital Esquadrias e Vidros', M + 22, top - 39 - vh, { size: 10.5, bold: true })
  const cx = M + 250
  txt('ASSINADO ELETRONICAMENTE', cx, top - 26, { size: 7.5, bold: true, cor: VERDE })
  txt('Vital Esquadrias e Vidros', cx, top - 43, { size: 11, bold: true })
  txt(`Representada por ${d.vitalPor}`, cx, top - 58, { size: 9.5, max: 60 })
  txt(`Data e hora: ${d.vitalEm}`, cx, top - 73, { size: 9.5 })
  txt('Assinatura registrada no envio do pedido pelo sistema Vital Financeiro.', cx, top - 90, { size: 7, cor: CINZA })

  // --- Cliente
  y = top - 104 - 30
  top = quadro('CLIENTE', y, 122)
  const maxW = 190
  const maxH = 62
  const esc = Math.min(maxW / rubrica.width, maxH / rubrica.height)
  pg.drawImage(rubrica, { x: M + 22, y: top - 14 - maxH + (maxH - rubrica.height * esc) / 2, width: rubrica.width * esc, height: rubrica.height * esc })
  pg.drawLine({ start: { x: M + 22, y: top - 82 }, end: { x: M + 22 + maxW, y: top - 82 }, thickness: 0.7, color: cor(TINTA) })
  txt(d.assinanteNome, M + 22, top - 96, { size: 10.5, bold: true, max: 38 })
  txt(`CPF/CNPJ ${d.assinanteDoc}`, M + 22, top - 110, { size: 9, cor: CINZA })
  txt('ASSINADO ELETRONICAMENTE', cx, top - 26, { size: 7.5, bold: true, cor: VERDE })
  txt(d.assinanteNome, cx, top - 43, { size: 11, bold: true, max: 40 })
  txt(`CPF/CNPJ: ${d.assinanteDoc}`, cx, top - 58, { size: 9.5 })
  txt(`Data e hora: ${d.assinadoEm}`, cx, top - 73, { size: 9.5 })
  txt(`Endereço de internet (IP): ${d.ip}`, cx, top - 88, { size: 9.5, max: 60 })
  txt('Declarou ter lido o pedido e concordar com ele, assinando pelo link recebido.', cx, top - 105, { size: 7, cor: CINZA })

  // rodapé
  y = top - 122 - 34
  pg.drawRectangle({ x: M, y: y - 44, width: W - 2 * M, height: 54, color: rgb(0.91, 0.96, 0.925) })
  txt('CÓDIGO DE VERIFICAÇÃO', M + 14, y - 6, { size: 7, bold: true, cor: VERDE_ESCURO })
  txt(d.verificacao, M + 14, y - 26, { size: 16, bold: true, cor: VERDE_ESCURO })
  txt('Guarde este código. Com ele a Vital localiza este termo', M + 250, y - 10, { size: 8, cor: VERDE_ESCURO })
  txt('e confirma a autenticidade da assinatura.', M + 250, y - 22, { size: 8, cor: VERDE_ESCURO })

  const pe = comOriginal
    ? 'Assinatura eletrônica simples, nos termos da MP 2.200-2/2001 e da Lei 14.063/2020. Horários de Brasília.'
    : 'O arquivo original não pôde ser anexado a este termo; ele está arquivado no sistema e é identificado pela impressão digital acima.'
  txt(pe, M, 44, { size: 7, cor: CINZA, max: 180 })
  txt('Vital Esquadrias e Vidros - www.vitalesquadriasevidros.com.br', M, 32, { size: 7, cor: CINZA })
  pg.drawRectangle({ x: 0, y: 0, width: W, height: 9, color: cor(VERDE_ESCURO) })

  return { bytes: await doc.save(), comOriginal }
}
