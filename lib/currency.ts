export function formatCurrency(value: number): string {
  return `${value.toLocaleString("pt-AO")} Kz`
}

export function parseCurrency(value: string): number {
  return Number.parseFloat(value.replace(/[^\d,]/g, "").replace(",", "."))
}
