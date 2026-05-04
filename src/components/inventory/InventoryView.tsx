'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { Plus, Package, Pencil } from 'lucide-react'

const STATUS_STYLE: Record<string, string> = {
  ok:           'bg-emerald-100 text-emerald-700',
  low:          'bg-amber-100 text-amber-700',
  critical:     'bg-red-100 text-red-700',
  out_of_stock: 'bg-red-200 text-red-800 font-bold',
}

const CATEGORIES = [
  'Restorative','Endodontic','Surgical','Preventive',
  'Orthodontic','Prosthetic','Anesthesia','Sterilization',
  'Veterinary','Office Supplies','Equipment','Other',
]

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
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">Add Inventory Item</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
        </div>
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
                {['piece','box','vial','tube','bottle','pack','set','roll','bag','syringe'].map(u => <option key={u}>{u}</option>)}
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
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={save} disabled={loading} className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-60">
            {loading ? 'Saving…' : 'Save Item'}
          </button>
          <button onClick={onClose} className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50">Cancel</button>
        </div>
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
