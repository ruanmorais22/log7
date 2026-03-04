import { AlertCircle, X } from 'lucide-react'
import Link from 'next/link'
import { differenceInDays } from 'date-fns'

interface TrialBannerProps {
  trialExpiresAt: string
}

export function TrialBanner({ trialExpiresAt }: TrialBannerProps) {
  const dias = differenceInDays(new Date(trialExpiresAt), new Date())
  if (dias > 7) return null

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2">
      <div className="flex items-center gap-2 text-amber-800 text-sm max-w-7xl mx-auto">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <p>
          {dias <= 0
            ? 'Seu trial expirou. '
            : `Seu trial expira em ${dias} dia${dias !== 1 ? 's' : ''}. `}
          <Link href="/configuracoes" className="font-semibold underline">
            Escolha um plano para continuar
          </Link>
        </p>
      </div>
    </div>
  )
}
