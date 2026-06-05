'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { PatientFile, PatientFileType } from '@/types'
import { cn, formatDateTime } from '@/lib/utils'
import toast from 'react-hot-toast'
import { Upload, FileText, ImageIcon, Trash2, ExternalLink, Loader2, X } from 'lucide-react'

const ACCEPTED_TYPES: Record<string, string> = {
  'image/jpeg': 'JPG',
  'image/png':  'PNG',
  'application/pdf': 'PDF',
}
const MAX_BYTES = 50 * 1024 * 1024

const TYPE_LABELS: Record<PatientFileType, string> = {
  xray:       'X-Ray',
  lab_result: 'Lab Result',
}

interface Props {
  patientId: string
  /** If omitted the user can pick the type inside the component */
  defaultFileType?: PatientFileType
}

interface UploadingFile {
  id: string
  name: string
  size: number
  progress: 'uploading' | 'done' | 'error'
  error?: string
}

export default function FileUpload({ patientId, defaultFileType }: Props) {
  const [files, setFiles]           = useState<PatientFile[]>([])
  const [uploading, setUploading]   = useState<UploadingFile[]>([])
  const [dragging, setDragging]     = useState(false)
  const [fileType, setFileType]     = useState<PatientFileType>(defaultFileType ?? 'xray')
  const [loading, setLoading]       = useState(true)
  const inputRef                    = useRef<HTMLInputElement>(null)

  // ── Load existing files ─────────────────────────────────────
  const loadFiles = useCallback(async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('patient_files')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })

    if (error) {
      toast.error('Could not load files: ' + error.message)
    } else {
      setFiles((data as PatientFile[]) ?? [])
    }
    setLoading(false)
  }, [patientId])

  useEffect(() => { loadFiles() }, [loadFiles])

  // ── Validate & queue upload ─────────────────────────────────
  function validateFile(file: File): string | null {
    if (!ACCEPTED_TYPES[file.type]) return 'Only JPG, PNG, and PDF files are allowed'
    if (file.size > MAX_BYTES)      return 'File exceeds the 50 MB limit'
    return null
  }

  async function uploadFile(file: File) {
    const tempId = crypto.randomUUID()

    setUploading(prev => [...prev, { id: tempId, name: file.name, size: file.size, progress: 'uploading' }])

    try {
      const body = new FormData()
      body.append('file',       file)
      body.append('patientId',  patientId)
      body.append('fileType',   fileType)

      const res  = await fetch('/api/upload', { method: 'POST', body })
      const json = await res.json()

      if (!res.ok) throw new Error(json.error ?? 'Upload failed')

      setUploading(prev => prev.map(u => u.id === tempId ? { ...u, progress: 'done' } : u))
      toast.success(`${file.name} uploaded`)
      await loadFiles()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed'
      setUploading(prev => prev.map(u => u.id === tempId ? { ...u, progress: 'error', error: msg } : u))
      toast.error(msg)
    } finally {
      // Remove the progress entry after a short delay
      setTimeout(() => setUploading(prev => prev.filter(u => u.id !== tempId)), 3000)
    }
  }

  function handleFiles(incoming: FileList | null) {
    if (!incoming) return
    Array.from(incoming).forEach(file => {
      const err = validateFile(file)
      if (err) { toast.error(`${file.name}: ${err}`); return }
      uploadFile(file)
    })
  }

  // ── Drag & drop handlers ────────────────────────────────────
  function onDragOver(e: React.DragEvent) {
    e.preventDefault()
    setDragging(true)
  }
  function onDragLeave() { setDragging(false) }
  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  // ── Delete ──────────────────────────────────────────────────
  async function deleteFile(record: PatientFile) {
    if (!confirm(`Delete "${record.file_name}"? This cannot be undone.`)) return

    const res  = await fetch('/api/upload', {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ recordId: record.id }),
    })
    const json = await res.json()

    if (!res.ok) { toast.error(json.error ?? 'Delete failed'); return }

    toast.success(`${record.file_name} deleted`)
    setFiles(prev => prev.filter(f => f.id !== record.id))
  }

  // ── Helpers ─────────────────────────────────────────────────
  function formatBytes(bytes: number) {
    if (bytes < 1024)        return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  function FileIcon({ mimeType }: { mimeType?: string }) {
    if (mimeType === 'application/pdf') return <FileText size={15} className="text-red-500" />
    return <ImageIcon size={15} className="text-blue-500" />
  }

  const xrayFiles  = files.filter(f => f.file_type === 'xray')
  const labFiles   = files.filter(f => f.file_type === 'lab_result')

  return (
    <div className="space-y-5">
      {/* Upload area */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Upload File</h3>
          {/* File type selector — hidden if parent fixed it */}
          {!defaultFileType && (
            <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
              {(['xray', 'lab_result'] as PatientFileType[]).map(t => (
                <button
                  key={t}
                  onClick={() => setFileType(t)}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-xs font-semibold transition-all',
                    fileType === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
                  )}
                >
                  {TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          )}
          {defaultFileType && (
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
              {TYPE_LABELS[defaultFileType]}
            </span>
          )}
        </div>

        {/* Drop zone */}
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all select-none',
            dragging
              ? 'border-blue-400 bg-blue-50'
              : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50',
          )}
        >
          <Upload size={24} className={cn('mx-auto mb-2', dragging ? 'text-blue-500' : 'text-slate-300')} />
          <p className="text-sm font-semibold text-slate-600">
            {dragging ? 'Drop to upload' : 'Drag & drop or click to browse'}
          </p>
          <p className="text-xs text-slate-400 mt-1">JPG, PNG, PDF · max 50 MB</p>
          <input
            ref={inputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            multiple
            className="hidden"
            onChange={e => handleFiles(e.target.files)}
          />
        </div>

        {/* In-progress uploads */}
        {uploading.length > 0 && (
          <div className="mt-3 space-y-2">
            {uploading.map(u => (
              <div key={u.id} className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-xs',
                u.progress === 'error'    ? 'bg-red-50 border border-red-200' :
                u.progress === 'done'     ? 'bg-emerald-50 border border-emerald-200' :
                'bg-blue-50 border border-blue-200',
              )}>
                {u.progress === 'uploading'
                  ? <Loader2 size={13} className="animate-spin text-blue-500 flex-shrink-0" />
                  : u.progress === 'done'
                  ? <span className="text-emerald-600 flex-shrink-0">✓</span>
                  : <X size={13} className="text-red-500 flex-shrink-0" />
                }
                <span className="flex-1 truncate font-medium text-slate-700">{u.name}</span>
                <span className="text-slate-400 flex-shrink-0">{formatBytes(u.size)}</span>
                {u.error && <span className="text-red-600 truncate max-w-[140px]">{u.error}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Files list */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Uploaded Files</h3>
          <span className="text-xs text-slate-400">{files.length} file{files.length !== 1 ? 's' : ''}</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={20} className="animate-spin text-slate-300" />
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-sm">No files uploaded yet</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {/* X-Rays */}
            {xrayFiles.length > 0 && (
              <FileSection label="X-Rays" files={xrayFiles} onDelete={deleteFile} />
            )}
            {/* Lab Results */}
            {labFiles.length > 0 && (
              <FileSection label="Lab Results" files={labFiles} onDelete={deleteFile} />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function FileSection({
  label,
  files,
  onDelete,
}: {
  label: string
  files: PatientFile[]
  onDelete: (f: PatientFile) => void
}) {
  return (
    <div>
      <div className="px-5 py-2 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
        {label}
      </div>
      {files.map(f => (
        <div
          key={f.id}
          className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
        >
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
            <FileRowIcon fileName={f.file_name} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-slate-800 truncate">{f.file_name}</div>
            <div className="text-xs text-slate-400 mt-0.5">{formatDateTime(f.created_at)}</div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <a
              href={f.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline px-2 py-1 rounded hover:bg-blue-50 transition-colors"
            >
              <ExternalLink size={12} /> View
            </a>
            <button
              onClick={() => onDelete(f)}
              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
              title="Delete file"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

function FileRowIcon({ fileName }: { fileName: string }) {
  const ext = fileName.split('.').pop()?.toLowerCase()
  if (ext === 'pdf') return <FileText size={15} className="text-red-500" />
  return <ImageIcon size={15} className="text-blue-500" />
}
