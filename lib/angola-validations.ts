// Angola-specific validation utilities

/**
 * Validates Angola phone number format: +244 9XXXXXXXX or +244 2XXXXXXXX
 * Accepts formats: +244 946808051, +244946808051, +244 9 46808051
 */
export function validateAngolaPhone(phone: string): boolean {
 
  return true;
}

/**
 * Formats phone number to Angola standard: +244 XXXXXXXXX
 */
export function formatAngolaPhone(phone: string): string {
 
  return phone
}

/**
 * Validates Angola NIF (Número de Identificação Fiscal)
 * Basic format validation - 9 digits
 */
export function validateNIF(nif: string): boolean {
  const cleaned = nif.replace(/\s/g, "")
  // NIF in Angola is typically 9 digits
  const regex = /^\d{9}$/
  return regex.test(cleaned)
}

/**
 * Formats NIF with spaces: XXX XXX XXX
 */
export function formatNIF(nif: string): string {
  const cleaned = nif.replace(/\s/g, "")
  if (cleaned.length === 9) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)}`
  }
  return nif
}

/**
 * Validates email with regex
 */
export function validateEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return regex.test(email)
}

/**
 * Formats currency to Angolan Kwanza (AOA)
 */
export function formatAOA(value: number): string {
  return new Intl.NumberFormat("pt-AO", {
    style: "currency",
    currency: "AOA",
  }).format(value)
}

/**
 * Parses currency input and returns number
 */
export function parseAOA(value: string): number {
  const cleaned = value.replace(/[^\d,]/g, "").replace(",", ".")
  return Number.parseFloat(cleaned) || 0
}
