'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, AlertTriangle, Loader2, UserX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function DesativarMotoristaPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const [loading, setLoading] = useState(false)

  async function handleDesativar() {
    setLoading(true)
    try {
      const res = await fetch(`/api/motoristas/${id}`, {
        method: 'DELETE',
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error ?? 'Erro ao desativar motorista.')
        return
      }
      toast.success('Motorista desativado com sucesso.')
      router.push('/motoristas')
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
          <Link href={`/motoristas/${id}`}>
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <h1 className="text-xl font-bold text-slate-900">Desativar Motorista</h1>
      </div>

      <Card className="border-red-200">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="bg-red-100 rounded-full p-3">
              <AlertTriangle className="size-6 text-red-600" />
            </div>
            <div>
              <CardTitle className="text-base text-red-900">Confirmar desativação</CardTitle>
              <CardDescription className="text-red-600">Esta ação pode ser revertida depois</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="text-sm text-slate-600 space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="text-slate-400 mt-0.5">•</span>
              O motorista não conseguirá mais fazer login no aplicativo.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-slate-400 mt-0.5">•</span>
              O histórico de viagens e gastos será mantido.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-slate-400 mt-0.5">•</span>
              Para reativar, edite o status do motorista para <strong>Ativo</strong>.
            </li>
          </ul>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" asChild>
              <Link href={`/motoristas/${id}`}>Cancelar</Link>
            </Button>
            <Button
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              onClick={handleDesativar}
              disabled={loading}
            >
              {loading ? (
                <><Loader2 className="size-4 animate-spin" />Desativando...</>
              ) : (
                <><UserX className="size-4" />Desativar motorista</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
