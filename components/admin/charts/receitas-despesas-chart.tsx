'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer
} from 'recharts'
import { formatCurrency } from '@/lib/utils'

interface DataPoint {
  mes: string
  receitas: number
  despesas: number
}

interface ReceitasDespesasChartProps {
  data: DataPoint[]
}

export function ReceitasDespesasChart({ data }: ReceitasDespesasChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="mes"
          tick={{ fontSize: 12, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 12, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip
          formatter={(value: number, name: string) => [
            formatCurrency(value),
            name === 'receitas' ? 'Receitas' : 'Despesas',
          ]}
          contentStyle={{
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            fontSize: '12px',
          }}
        />
        <Legend
          formatter={(value) => value === 'receitas' ? 'Receitas' : 'Despesas'}
        />
        <Line
          type="monotone"
          dataKey="receitas"
          stroke="#f97316"
          strokeWidth={2}
          dot={{ r: 4, fill: '#f97316' }}
          activeDot={{ r: 6 }}
        />
        <Line
          type="monotone"
          dataKey="despesas"
          stroke="#64748b"
          strokeWidth={2}
          dot={{ r: 4, fill: '#64748b' }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
