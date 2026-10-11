import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
  }).format(value)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('tr-TR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date))
}

export function generateBatchNumber(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `B${year}${month}${day}-${random}`
}

export function slugify(text: string): string {
  const trMap: { [key: string]: string } = {
    'ğ': 'g', 'Ğ': 'g',
    'ü': 'u', 'Ü': 'u',
    'ş': 's', 'Ş': 's',
    'ı': 'i', 'İ': 'i',
    'ö': 'o', 'Ö': 'o',
    'ç': 'c', 'Ç': 'c'
  }

  return text
    .split('')
    .map(char => trMap[char] || char)
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-')         // Replace spaces with dashes
    .replace(/-+/g, '-')          // Remove duplicate dashes
    .trim()
}

export function genderLabel(gender: string | null | undefined): string {
  switch (gender) {
    case 'men': return 'Erkek'
    case 'women': return 'Kadın'
    case 'kolonya': return 'Kolonya'
    default: return 'Unisex'
  }
}

export function inspiredByLabel(name: string): string {
  return `${name.replace(/\s*\d+\s*ml\s*/gi, '').trim()} parfümden esinlenilmiştir`
}
