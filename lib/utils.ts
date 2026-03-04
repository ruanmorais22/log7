import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, formatDistanceToNow, isAfter, isBefore, addDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatDate(date: string | Date | null): string {
  if (!date) return '—'
  return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR })
}

export function formatDateTime(date: string | Date | null): string {
  if (!date) return '—'
  return format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
}

export function formatRelative(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR })
}

export function isExpired(date: string | null): boolean {
  if (!date) return false
  return isBefore(new Date(date), new Date())
}

export function expiresInDays(date: string | null, days: number): boolean {
  if (!date) return false
  const target = new Date(date)
  const threshold = addDays(new Date(), days)
  return isAfter(threshold, target) && !isBefore(target, new Date())
}

export function formatPlaca(placa: string): string {
  placa = placa.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (placa.length === 7) {
    if (/^[A-Z]{3}[0-9]{4}$/.test(placa)) {
      return placa.replace(/([A-Z]{3})([0-9]{4})/, '$1-$2')
    }
    if (/^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(placa)) {
      return placa.replace(/([A-Z]{3})([0-9][A-Z][0-9]{2})/, '$1-$2')
    }
  }
  return placa
}

export function calcularVariacao(atual: number, anterior: number): number {
  if (anterior === 0) return atual > 0 ? 100 : 0
  return ((atual - anterior) / anterior) * 100
}

export function downloadCSV(data: Record<string, unknown>[], filename: string): void {
  if (!data.length) return
  const headers = Object.keys(data[0])
  const rows = data.map((row) =>
    headers.map((h) => JSON.stringify(row[h] ?? '')).join(',')
  )
  const csv = [headers.join(','), ...rows].join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

