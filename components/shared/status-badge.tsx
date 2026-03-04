import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type StatusType = 'veiculo' | 'gasto' | 'manutencao' | 'viagem' | 'user'

const configs: Record<StatusType, Record<string, { label: string; className: string }>> = {
  veiculo: {
    disponivel: { label: 'Disponível', className: 'bg-emerald-100 text-emerald-700' },
    em_rota: { label: 'Em Rota', className: 'bg-blue-100 text-blue-700' },
    manutencao: { label: 'Manutenção', className: 'bg-amber-100 text-amber-700' },
    inativo: { label: 'Inativo', className: 'bg-slate-100 text-slate-600' },
  },
  gasto: {
    pendente: { label: 'Pendente', className: 'bg-amber-100 text-amber-700' },
    aprovado: { label: 'Aprovado', className: 'bg-emerald-100 text-emerald-700' },
    rejeitado: { label: 'Rejeitado', className: 'bg-red-100 text-red-700' },
  },
  manutencao: {
    agendada: { label: 'Agendada', className: 'bg-blue-100 text-blue-700' },
    em_andamento: { label: 'Em Andamento', className: 'bg-amber-100 text-amber-700' },
    concluida: { label: 'Concluída', className: 'bg-emerald-100 text-emerald-700' },
  },
  viagem: {
    ativa: { label: 'Ativa', className: 'bg-blue-100 text-blue-700' },
    encerrada: { label: 'Encerrada', className: 'bg-slate-100 text-slate-600' },
    cancelada: { label: 'Cancelada', className: 'bg-red-100 text-red-700' },
  },
  user: {
    ativo: { label: 'Ativo', className: 'bg-emerald-100 text-emerald-700' },
    inativo: { label: 'Inativo', className: 'bg-slate-100 text-slate-600' },
    ferias: { label: 'Férias', className: 'bg-blue-100 text-blue-700' },
    afastado: { label: 'Afastado', className: 'bg-amber-100 text-amber-700' },
  },
}

interface StatusBadgeProps {
  type: StatusType
  status: string
  className?: string
}

export function StatusBadge({ type, status, className }: StatusBadgeProps) {
  const config = configs[type]?.[status]
  if (!config) return <Badge variant="outline">{status}</Badge>

  return (
    <Badge className={cn('border-0 font-medium text-xs', config.className, className)}>
      {config.label}
    </Badge>
  )
}
