'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, LogOut, Save } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { FileUpload } from '@/components/shared/file-upload'

interface PerfilEditFormProps {
  userId: string
  tenantId: string
  initialNome: string
  initialTelefone: string
  cnhUrl?: string
  asoUrl?: string
}

export function PerfilEditForm({
  userId,
  tenantId,
  initialNome,
  initialTelefone,
  cnhUrl,
  asoUrl,
}: PerfilEditFormProps) {
  const router = useRouter()
  const supabase = createClient()

  const [nome, setNome] = useState(initialNome)
  const [telefone, setTelefone] = useState(initialTelefone)
  const [saving, setSaving] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const [cnhFrenteUrl, setCnhFrenteUrl] = useState<string>(cnhUrl ?? '')
  const [cnhVersoUrl, setCnhVersoUrl] = useState<string>('')
  const [asoDocUrl, setAsoDocUrl] = useState<string>(asoUrl ?? '')

  async function handleSave() {
    if (!nome.trim()) {
      toast.error('Nome é obrigatório')
      return
    }

    setSaving(true)
    try {
      const updateData: Record<string, unknown> = {
        nome: nome.trim(),
        telefone: telefone.trim() || null,
      }

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId)

      if (error) throw error

      toast.success('Perfil atualizado com sucesso!')
      router.refresh()
    } catch {
      toast.error('Erro ao salvar perfil')
    } finally {
      setSaving(false)
    }
  }

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await supabase.auth.signOut()
      router.push('/login')
    } catch {
      toast.error('Erro ao sair')
      setLoggingOut(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Edit form */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-4">
        <h2 className="font-semibold text-slate-800">Editar Dados</h2>

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-700">Nome</label>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full px-4 py-4 rounded-xl border border-slate-200 bg-white text-slate-800 text-base focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-700">Telefone</label>
          <input
            type="tel"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            placeholder="(11) 99999-9999"
            className="w-full px-4 py-4 rounded-xl border border-slate-200 bg-white text-slate-800 text-base placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-orange-500 text-white py-4 rounded-xl font-bold text-base hover:bg-orange-600 active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Salvar Alterações
            </>
          )}
        </button>
      </div>

      {/* Document uploads */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-4">
        <h2 className="font-semibold text-slate-800">Documentos</h2>
        <p className="text-xs text-slate-500">
          Envie seus documentos digitalizados. Máximo 5MB por arquivo.
        </p>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-slate-700">CNH — Frente</label>
            <FileUpload
              bucket="documentos"
              tenantId={tenantId}
              onUpload={setCnhFrenteUrl}
              currentUrl={cnhFrenteUrl || undefined}
              accept="image/*,application/pdf"
              label="CNH Frente"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-slate-700">CNH — Verso</label>
            <FileUpload
              bucket="documentos"
              tenantId={tenantId}
              onUpload={setCnhVersoUrl}
              currentUrl={cnhVersoUrl || undefined}
              accept="image/*,application/pdf"
              label="CNH Verso"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-slate-700">ASO — Atestado de Saúde Ocupacional</label>
            <FileUpload
              bucket="documentos"
              tenantId={tenantId}
              onUpload={setAsoDocUrl}
              currentUrl={asoDocUrl || undefined}
              accept="image/*,application/pdf"
              label="ASO"
            />
          </div>
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        disabled={loggingOut}
        className="w-full bg-white border border-red-200 text-red-500 py-4 rounded-2xl font-bold text-base hover:bg-red-50 active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {loggingOut ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Saindo...
          </>
        ) : (
          <>
            <LogOut className="h-4 w-4" />
            Sair da conta
          </>
        )}
      </button>

      {/* Safe area bottom padding */}
      <div className="h-4" />
    </div>
  )
}
