'use client'

import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { formatCurrency } from '@/lib/utils'

const COLORS = ['#f97316', '#64748b', '#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#84cc16']

const LABELS: Record<string, string> = {
  combustivel: 'Combustível',
  pedagio: 'Pedágio',
  manutencao_rota: 'Manutenção',
  alimentacao: 'Alimentação',
  hospedagem: 'Hospedagem',
  lavagem: 'Lavagem',
  multa: 'Multa',
  outros: 'Outros',
}

interface DataPoint {
  categoria: string
  total: number
}

interface GastosCategoriaChartProps {
  data: DataPoint[]
}

export function GastosCategoriaChart({ data }: GastosCategoriaChartProps) {
  const chartData = data.map((d) => ({ ...d, name: LABELS[d.categoria] ?? d.categoria }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          outerRadius={100}
          dataKey="total"
          nameKey="name"
        >
          {chartData.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number, name: string) => [formatCurrency(value), name]}
          contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => <span style={{ fontSize: 12, color: '#64748b' }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
