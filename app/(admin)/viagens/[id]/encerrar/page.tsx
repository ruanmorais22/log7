'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, AlertTriangle, Loader2, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function EncerrarViagemPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const [loading, setLoading] = useState(false)
  const [kmFim, setKmFim] = useState('')

  async function handleEncerrar() {
    setLoading(true)
    try {
      const res = await fetch(`/api/viagens/${id}/encerrar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ km_fim: kmFim ? Number(kmFim) : null }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error ?? 'Erro ao encerrar viagem.')
        return
      }
      toast.success('Viagem encerrada com sucesso.')
      router.push(`/viagens/${id}`)
    } catch {
      toast.error('Erro de conexão.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-6 py-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/viagens/${id}`}>
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <h1 className="text-xl font-bold text-slate-900">Encerrar Viagem</h1>
      </div>

      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            Use apenas em caso de emergência ou quando o motorista não puder encerrar no app.
            Esta ação é irreversível.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Confirmar encerramento</CardTitle>
          <CardDescription>
            O veículo voltará ao status <strong>Disponível</strong> e a viagem será marcada como encerrada.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="km_fim">KM Final (opcional)</Label>
            <Input
              id="km_fim"
              type="number"
              placeholder="Ex: 150000"
              value={kmFim}
              onChange={(e) => setKmFim(e.target.value)}
            />
            <p className="text-xs text-slate-500">
              Se informado, atualiza a quilometragem do veículo.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" asChild>
              <Link href={`/viagens/${id}`}>Cancelar</Link>
            </Button>
            <Button
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              onClick={handleEncerrar}
              disabled={loading}
            >
              {loading ? (
                <><Loader2 className="size-4 animate-spin" />Encerrando...</>
              ) : (
                <><Square className="size-4" />Encerrar viagem</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
