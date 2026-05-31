// lib/format.ts

// capitalizes first letter of each word — "john doe" → "John Doe"
export function toTitleCase(value: string): string {
  return value
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

// capitalizes only the first letter — "computer science" → "Computer science"
export function toSentenceCase(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return trimmed
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}

// formats a raw phone input to (xxx) xxx-xxxx
// strips all non-digits first, then applies the mask
export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 10)

  if (digits.length < 4) return digits
  if (digits.length < 7) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  }
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}