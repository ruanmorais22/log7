import { cn } from '@/lib/utils'
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface KpiCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  iconColor?: string
  trend?: number
  className?: string
}

export function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'text-orange-500',
  trend,
  className,
}: KpiCardProps) {
  return (
    <Card className={cn('border-slate-200', className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-slate-500 font-medium">{title}</p>
          <div className={cn('p-2 rounded-lg bg-slate-100', iconColor.replace('text-', 'bg-').replace('-500', '-100'))}>
            <Icon className={cn('h-5 w-5', iconColor)} />
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          {trend !== undefined && (
            <div className={cn(
              'flex items-center gap-1 text-xs font-medium',
              trend >= 0 ? 'text-emerald-600' : 'text-red-500'
            )}>
              {trend >= 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {Math.abs(trend).toFixed(1)}% vs. mês anterior
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
