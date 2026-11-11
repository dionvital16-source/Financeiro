// Validação de CPF e CNPJ (inclusive o CNPJ com letras, válido a partir de 2026).

export function soDoc(s: string): string {
  return (s ?? '').toUpperCase().replace(/[^0-9A-Z]/g, '')
}

export function cpfValido(c: string): boolean {
  if (!/^\d{11}$/.test(c) || /^(\d)\1{10}$/.test(c)) return false
  const dv = (n: number) => {
    let soma = 0
    for (let i = 0; i < n; i++) soma += Number(c[i]) * (n + 1 - i)
    const r = (soma * 10) % 11
    return r === 10 ? 0 : r
  }
  return dv(9) === Number(c[9]) && dv(10) === Number(c[10])
}

export function cnpjValido(c: string): boolean {
  if (!/^[0-9A-Z]{12}\d{2}$/.test(c) || /^(.)\1{13}$/.test(c)) return false
  const dv = (n: number) => {
    let soma = 0
    let peso = n - 7
    for (let i = 0; i < n; i++) {
      soma += (c.charCodeAt(i) - 48) * peso
      peso = peso === 2 ? 9 : peso - 1
    }
    const r = soma % 11
    return r < 2 ? 0 : 11 - r
  }
  return dv(12) === Number(c[12]) && dv(13) === Number(c[13])
}

export function docValido(s: string): boolean {
  const d = soDoc(s)
  return d.length === 11 ? cpfValido(d) : d.length === 14 ? cnpjValido(d) : false
}

export function formatarDoc(s: string): string {
  const d = soDoc(s)
  if (d.length === 11) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
  if (d.length === 14) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
  return d
}
