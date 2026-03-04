'use client'

import { useState, useRef } from 'react'
import { Upload, X, FileImage, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

interface FileUploadProps {
  bucket: 'comprovantes' | 'documentos' | 'fotos'
  tenantId: string
  onUpload: (url: string) => void
  currentUrl?: string
  accept?: string
  label?: string
}

export function FileUpload({
  bucket,
  tenantId,
  onUpload,
  currentUrl,
  accept = 'image/*,application/pdf',
  label = 'Comprovante',
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo: 5MB')
      return
    }

    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${tenantId}/${Date.now()}.${ext}`

      const { error } = await supabase.storage
        .from(bucket)
        .upload(path, file, { upsert: true })

      if (error) throw error

      const { data } = supabase.storage.from(bucket).getPublicUrl(path)
      setPreview(data.publicUrl)
      onUpload(data.publicUrl)
      toast.success('Arquivo enviado com sucesso!')
    } catch {
      toast.error('Erro ao enviar arquivo')
    } finally {
      setUploading(false)
    }
  }

  function handleRemove() {
    setPreview(null)
    onUpload('')
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="space-y-2">
      {preview ? (
        <div className="flex items-center gap-2 p-2 border rounded-md bg-slate-50">
          <FileImage className="h-4 w-4 text-slate-500 shrink-0" />
          <span className="text-sm text-slate-600 truncate flex-1">
            {label} enviado
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleRemove}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <div
          className={cn(
            'border-2 border-dashed border-slate-200 rounded-md p-4 text-center cursor-pointer',
            'hover:border-orange-400 hover:bg-orange-50 transition-colors'
          )}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <div className="flex items-center justify-center gap-2 text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Enviando...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 text-slate-500">
              <Upload className="h-4 w-4" />
              <span className="text-sm">{label} (foto ou PDF)</span>
            </div>
          )}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleFileChange}
        disabled={uploading}
      />
    </div>
  )
}
