'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { Plus, Package, Pencil, Upload, Download } from 'lucide-react'

const STATUS_STYLE: Record<string, string> = {
  ok:           'bg-emerald-100 text-emerald-700',
  low:          'bg-amber-100 text-amber-700',
  critical:     'bg-red-100 text-red-700',
  out_of_stock: 'bg-red-200 text-red-800 font-bold',
}

const CATEGORIES = [
  'Restorative','Endodontic','Surgical','Preventive',
  'Orthodontic','Prosthetic','Anesthesia','Sterilization',
  'Office Supplies','Equipment','Other',
]

const UNITS = ['piece','box','vial','tube','bottle','pack','set','roll','bag','syringe']

const INV_CSV_HEADERS = ['name','category','unit','stock_quantity','reorder_level','unit_cost','supplier','notes']
const INV_CSV_TEMPLATE = [
  INV_CSV_HEADERS.join(','),
  'Composite Resin A2,Restorative,tube,10,3,450.00,Dental Supply Co.,Keep refrigerated',
  'Dental Anesthetic 2%,Anesthesia,vial,20,5,85.00,PhilDenta,Check expiry date',
  'Latex Gloves (M),Surgical,box,15,5,320.00,MedLine PH,',
].join('\n')

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (line[i] === ',' && !inQuotes) {
      result.push(current); current = ''
    } else {
      current += line[i]
    }
  }
  result.push(current)
  return result
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []
  const headers = parseCSVLine(lines[0]).map(h => h.trim().replace(/^"|"$/g, '').toLowerCase())
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const values = parseCSVLine(line)
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = (values[i] || '').trim().replace(/^"|"$/g, '') })
    return row
  })
}

export default function InventoryView({ items }: { items: any[] }) {
  const router = useRouter()
  const [filter, setFilter] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [adjustItem, setAdjustItem] = useState<any>(null)

  const cats = Array.from(new Set(items.map((i:any) => i.category).filter(Boolean))) as string[]
  const filtered = items.filter((i:any) => {
    if (filter === 'all') return true
    if (filter === 'low') return ['low','critical','out_of_stock'].includes(i.status)
    return i.category?.toLowerCase() === filter.toLowerCase()
  })

  async function reorder(id: string, name: string) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Not authenticated'); return }
    const { data: staff } = await supabase.from('staff_profiles').select('clinic_id,full_name').eq('id', user.id).single()
    if (staff) {
      await supabase.from('audit_logs').insert({
        clinic_id: staff.clinic_id, user_id: user.id, user_name: staff.full_name,
        action: `Reorder requested: ${name}`, resource_type: 'inventory_item', resource_id: id,
      })
    }
    toast.success(`Reorder request logged: ${name}`)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          {[['all','All Items'],['low','⚠️ Low Stock'],...cats.map((c:string) => [c.toLowerCase(), c])].map(([val,lbl]) => (
            <button key={val} onClick={() => setFilter(val)}
              className={cn('px-3 py-1.5 text-sm font-semibold rounded-lg border transition-colors',
                filter === val ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 bg-white hover:border-blue-300 hover:text-blue-600')}>
              {lbl}
            </button>
          ))}
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700">
          <Plus size={15} /> Add Item
        </button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label:'Total Items',     value: items.length,                                                    color:'text-slate-900',   bg:'bg-white' },
          { label:'In Stock (OK)',   value: items.filter((i:any) => i.status === 'ok').length,               color:'text-emerald-600', bg:'bg-emerald-50' },
          { label:'Low / Critical',  value: items.filter((i:any) => ['low','critical'].includes(i.status)).length, color:'text-amber-600', bg:'bg-amber-50' },
          { label:'Out of Stock',    value: items.filter((i:any) => i.status === 'out_of_stock').length,     color:'text-red-600',     bg:'bg-red-50' },
        ].map(s => (
          <div key={s.label} className={cn('rounded-xl p-4 border border-slate-200', s.bg)}>
            <div className="text-xs text-slate-500 font-medium mb-1">{s.label}</div>
            <div className={cn('text-2xl font-bold', s.color)}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {['Item','Category','Stock','Reorder At','Level','Unit Cost','Supplier','Status',''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((item:any) => {
              const pct = item.reorder_level > 0 ? Math.min(100, Math.round(item.stock_quantity / (item.reorder_level * 2) * 100)) : 100
              return (
                <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="text-sm font-semibold text-slate-900">{item.name}</div>
                    {item.notes && <div className="text-xs text-slate-400 truncate max-w-[160px]">{item.notes}</div>}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">{item.category}</td>
                  <td className={cn('px-4 py-3 text-sm font-bold', item.stock_quantity === 0 ? 'text-red-600' : item.stock_quantity <= item.reorder_level ? 'text-amber-600' : 'text-slate-900')}>
                    {item.stock_quantity} <span className="font-normal text-slate-400">{item.unit}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">{item.reorder_level}</td>
                  <td className="px-4 py-3 w-24">
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width:`${pct}%`, background: pct < 20 ? '#ef4444' : pct < 50 ? '#f59e0b' : '#10b981' }}/>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{pct}%</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{item.unit_cost ? `₱${Number(item.unit_cost).toLocaleString()}` : '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 max-w-[100px] truncate">{item.supplier || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', STATUS_STYLE[item.status] || 'bg-slate-100 text-slate-600')}>
                      {item.status?.replace('_',' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => setAdjustItem(item)} className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-0.5">
                        <Pencil size={11}/> Adjust
                      </button>
                      <button onClick={() => reorder(item.id, item.name)} className="text-xs font-semibold text-slate-500 hover:underline whitespace-nowrap">
                        Reorder
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={9} className="text-center py-12 text-slate-400 text-sm">
                <Package size={28} className="mx-auto mb-2 opacity-30"/>
                No items found. Click &quot;Add Item&quot; to get started.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showAdd && <AddItemModal onClose={() => setShowAdd(false)} onSave={() => { setShowAdd(false); router.refresh() }} />}
      {adjustItem && <AdjustStockModal item={adjustItem} onClose={() => setAdjustItem(null)} onSave={() => { setAdjustItem(null); router.refresh() }} />}
    </div>
  )
}

function AddItemModal({ onClose, onSave }: { onClose: ()=>void; onSave: ()=>void }) {
  const [tab, setTab] = useState<'single' | 'bulk'>('single')

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl my-4">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">Add Inventory Item</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
        </div>

        <div className="flex gap-1 bg-slate-100 rounded-lg p-1 mb-5">
          <button onClick={() => setTab('single')} className={cn('flex-1 py-2 rounded-md text-sm font-semibold transition-all', tab === 'single' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
            Single Item
          </button>
          <button onClick={() => setTab('bulk')} className={cn('flex-1 py-2 rounded-md text-sm font-semibold transition-all flex items-center justify-center gap-1.5', tab === 'bulk' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
            <Upload size={13}/> Bulk Upload
          </button>
        </div>

        {tab === 'single' ? <SingleItemForm onClose={onClose} onSave={onSave} /> : <BulkInventoryUpload onClose={onClose} onSave={onSave} />}
      </div>
    </div>
  )
}

function SingleItemForm({ onClose, onSave }: { onClose: ()=>void; onSave: ()=>void }) {
  const [loading, setLoading] = useState(false)
  const [f, setF] = useState({ name:'', category:'Restorative', unit:'piece', stock_quantity:'0', reorder_level:'5', unit_cost:'', supplier:'', notes:'' })
  const s = (k:string) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) => setF(p => ({...p,[k]:e.target.value}))

  async function save() {
    if (!f.name.trim()) { toast.error('Item name is required'); return }
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Not authenticated'); setLoading(false); return }
    const { data: staff } = await supabase.from('staff_profiles').select('clinic_id').eq('id', user.id).single()
    if (!staff) { toast.error('Staff profile not found'); setLoading(false); return }

    const { error } = await supabase.from('inventory_items').insert({
      clinic_id: staff.clinic_id, name: f.name.trim(), category: f.category,
      unit: f.unit || 'piece', stock_quantity: Number(f.stock_quantity) || 0,
      reorder_level: Number(f.reorder_level) || 5,
      unit_cost: f.unit_cost ? Number(f.unit_cost) : null,
      supplier: f.supplier || null, notes: f.notes || null,
    })

    if (error) { toast.error(error.message); setLoading(false); return }
    toast.success(`"${f.name}" added to inventory`)
    setLoading(false); onSave()
  }

  return (
    <div className="space-y-3">
      <F label="Item Name *" value={f.name} onChange={s('name')} placeholder="e.g. Composite Resin A2, Dental Anesthetic 2%"/>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-xs font-semibold text-slate-600 mb-1">Category *</label>
          <select value={f.category} onChange={s('category')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400">
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div><label className="block text-xs font-semibold text-slate-600 mb-1">Unit</label>
          <select value={f.unit} onChange={s('unit')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400">
            {UNITS.map(u => <option key={u}>{u}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <F label="Current Stock *" type="number" value={f.stock_quantity} onChange={s('stock_quantity')} placeholder="0"/>
        <F label="Reorder Alert Level *" type="number" value={f.reorder_level} onChange={s('reorder_level')} placeholder="5"/>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <F label="Unit Cost (₱)" type="number" value={f.unit_cost} onChange={s('unit_cost')} placeholder="0.00"/>
        <F label="Supplier" value={f.supplier} onChange={s('supplier')} placeholder="Supplier name"/>
      </div>
      <div><label className="block text-xs font-semibold text-slate-600 mb-1">Notes</label>
        <textarea value={f.notes} onChange={s('notes')} rows={2} placeholder="Storage instructions, expiry…"
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 resize-none"/>
      </div>
      <div className="flex gap-2 mt-2">
        <button onClick={save} disabled={loading} className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-60">
          {loading ? 'Saving…' : 'Save Item'}
        </button>
        <button onClick={onClose} className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50">Cancel</button>
      </div>
    </div>
  )
}

function BulkInventoryUpload({ onClose, onSave }: { onClose: ()=>void; onSave: ()=>void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<Record<string, string>[]>([])
  const [fileName, setFileName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null)

  function downloadTemplate() {
    const blob = new Blob([INV_CSV_TEMPLATE], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'inventory_upload_template.csv'
    document.body.appendChild(a); a.click()
    document.body.removeChild(a); URL.revokeObjectURL(url)
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setResult(null)
    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target?.result as string
      setRows(parseCSV(text))
    }
    reader.readAsText(file)
  }

  async function upload() {
    if (rows.length === 0) { toast.error('No rows to upload'); return }
    setUploading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Not authenticated'); setUploading(false); return }
    const { data: staff } = await supabase.from('staff_profiles').select('clinic_id').eq('id', user.id).single()
    if (!staff) { toast.error('Staff profile not found'); setUploading(false); return }

    const valid = rows.filter(r => r.name?.trim())
    if (valid.length === 0) { toast.error('No valid rows — name is required'); setUploading(false); return }

    const payload = valid.map(r => ({
      clinic_id: staff.clinic_id,
      name: r.name.trim(),
      category: CATEGORIES.includes(r.category?.trim()) ? r.category.trim() : 'Other',
      unit: UNITS.includes(r.unit?.trim()) ? r.unit.trim() : 'piece',
      stock_quantity: Number(r.stock_quantity) || 0,
      reorder_level: Number(r.reorder_level) || 5,
      unit_cost: r.unit_cost?.trim() ? Number(r.unit_cost) : null,
      supplier: r.supplier?.trim() || null,
      notes: r.notes?.trim() || null,
    }))

    const { data: inserted, error } = await supabase.from('inventory_items').insert(payload).select('id')
    const successCount = inserted?.length || 0
    const failedCount = valid.length - successCount

    if (error) toast.error(error.message)
    else toast.success(`${successCount} item${successCount !== 1 ? 's' : ''} added to inventory`)

    setResult({ success: successCount, failed: rows.length - valid.length + failedCount })
    setUploading(false)
    if (!error) setTimeout(() => onSave(), 1200)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
        <div>
          <div className="text-xs font-bold text-slate-700">CSV Template</div>
          <div className="text-xs text-slate-500 mt-0.5">Download to see the required columns and format</div>
        </div>
        <button onClick={downloadTemplate} className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 border border-blue-200 px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors whitespace-nowrap">
          <Download size={13}/> Download Template
        </button>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Upload CSV File</label>
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-all"
        >
          <Upload size={20} className="mx-auto mb-2 text-slate-400" />
          {fileName
            ? <div className="text-sm font-semibold text-slate-700">{fileName}</div>
            : <div className="text-sm text-slate-400">Click to choose a CSV file</div>}
          {rows.length > 0 && <div className="text-xs text-blue-600 font-semibold mt-1">{rows.length} row{rows.length !== 1 ? 's' : ''} detected</div>}
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
        </div>
      </div>

      {rows.length > 0 && !result && (
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-wide">
            Preview — first {Math.min(3, rows.length)} of {rows.length} rows
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100">
                  {['name','category','unit','stock_quantity','reorder_level'].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-semibold text-slate-500 capitalize">{h.replace('_',' ')}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 3).map((r, i) => (
                  <tr key={i} className={cn('border-b border-slate-50', !r.name && 'bg-red-50')}>
                    <td className={cn('px-3 py-2 font-medium', !r.name && 'text-red-500')}>{r.name || '⚠ missing'}</td>
                    <td className="px-3 py-2 text-slate-600">{r.category || 'Other'}</td>
                    <td className="px-3 py-2 text-slate-600">{r.unit || 'piece'}</td>
                    <td className="px-3 py-2 text-slate-600">{r.stock_quantity || '0'}</td>
                    <td className="px-3 py-2 text-slate-600">{r.reorder_level || '5'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {result && (
        <div className={cn('rounded-xl p-4 text-sm font-semibold', result.failed === 0 ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-amber-50 border border-amber-200 text-amber-700')}>
          ✓ {result.success} item{result.success !== 1 ? 's' : ''} added{result.failed > 0 ? ` · ${result.failed} skipped (missing name)` : ''}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={upload}
          disabled={uploading || rows.length === 0 || !!result}
          className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2"
        >
          <Upload size={14}/>
          {uploading ? 'Uploading…' : result ? 'Done' : `Upload ${rows.length} Item${rows.length !== 1 ? 's' : ''}`}
        </button>
        <button onClick={onClose} className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50">
          {result ? 'Close' : 'Cancel'}
        </button>
      </div>
    </div>
  )
}

function AdjustStockModal({ item, onClose, onSave }: { item:any; onClose:()=>void; onSave:()=>void }) {
  const [mode, setMode] = useState<'add'|'subtract'|'set'>('add')
  const [qty, setQty] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  const preview = qty && !isNaN(Number(qty))
    ? mode === 'add' ? item.stock_quantity + Number(qty)
    : mode === 'subtract' ? Math.max(0, item.stock_quantity - Number(qty))
    : Number(qty) : null

  async function save() {
    const n = Number(qty)
    if (!qty || isNaN(n) || n < 0) { toast.error('Enter a valid quantity'); return }
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Not authenticated'); setLoading(false); return }
    const newQty = mode === 'add' ? item.stock_quantity + n : mode === 'subtract' ? Math.max(0, item.stock_quantity - n) : n
    const { error } = await supabase.from('inventory_items').update({
      stock_quantity: newQty,
      ...(mode === 'add' ? { last_restocked_at: new Date().toISOString() } : {}),
      ...(mode === 'subtract' ? { last_used_at: new Date().toISOString() } : {}),
    }).eq('id', item.id)
    if (error) { toast.error(error.message); setLoading(false); return }

    const { data: staff } = await supabase.from('staff_profiles').select('clinic_id,full_name').eq('id', user.id).single()
    if (staff) {
      await supabase.from('audit_logs').insert({
        clinic_id: staff.clinic_id, user_id: user.id, user_name: staff.full_name,
        action: `Stock ${mode === 'add' ? 'added' : mode === 'subtract' ? 'removed' : 'set'}: ${item.name} → ${newQty} ${item.unit}${reason ? ` (${reason})` : ''}`,
        resource_type: 'inventory_item', resource_id: item.id,
      })
    }
    toast.success(`Stock updated: ${item.name} → ${newQty} ${item.unit}`)
    setLoading(false); onSave()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold">Adjust Stock</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
        </div>
        <div className="bg-slate-50 rounded-xl p-3 mb-4">
          <div className="text-sm font-semibold text-slate-800">{item.name}</div>
          <div className="text-xs text-slate-500 mt-0.5">Current: <strong className="text-slate-800">{item.stock_quantity} {item.unit}</strong></div>
        </div>
        <div className="flex gap-2 mb-4">
          {[['add','+ Add'],['subtract','− Remove'],['set','= Set']].map(([m,lbl]) => (
            <button key={m} onClick={() => setMode(m as 'add'|'subtract'|'set')}
              className={cn('flex-1 py-2 rounded-lg text-xs font-bold border transition-colors',
                mode === m ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-600 hover:border-blue-300')}>
              {lbl}
            </button>
          ))}
        </div>
        <div className="space-y-3">
          <F label={mode === 'add' ? 'Qty to Add' : mode === 'subtract' ? 'Qty to Remove' : 'New Total'} type="number" value={qty} onChange={e => setQty(e.target.value)} placeholder="0"/>
          <F label="Reason (optional)" value={reason} onChange={e => setReason(e.target.value)} placeholder="Restocked, used in procedure…"/>
        </div>
        {preview !== null && (
          <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs font-semibold text-blue-700">
            New total: <strong>{preview} {item.unit}</strong>
          </div>
        )}
        <div className="flex gap-2 mt-4">
          <button onClick={save} disabled={loading} className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-60">
            {loading ? 'Saving…' : 'Update Stock'}
          </button>
          <button onClick={onClose} className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50">Cancel</button>
        </div>
      </div>
    </div>
  )
}

function F({ label, value, onChange, type='text', placeholder='' }: { label:string; value:string; onChange:(e:React.ChangeEvent<HTMLInputElement>)=>void; type?:string; placeholder?:string }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"/>
    </div>
  )
}
