'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Invoice } from '@/types'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { cn, formatDate, formatPHP } from '@/lib/utils'
import { Plus, Search, Printer, CreditCard } from 'lucide-react'

const STATUS_STYLE: Record<string, string> = {
  paid:      'bg-emerald-100 text-emerald-700',
  draft:     'bg-slate-100 text-slate-600',
  issued:    'bg-blue-100 text-blue-700',
  partial:   'bg-amber-100 text-amber-700',
  overdue:   'bg-red-100 text-red-700',
  cancelled: 'bg-slate-100 text-slate-400',
}

export default function BillingView({ invoices: initial }: { invoices: Invoice[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [invoices, setInvoices] = useState<Invoice[]>(initial)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [showOR, setShowOR] = useState<Invoice | null>(null)
  const [payModal, setPayModal] = useState<Invoice | null>(null)

  // Auto-open create modal if ?new=1 in URL (from clinical workflow billing step)
  useEffect(() => {
    if (searchParams.get('new') === '1') setShowCreate(true)
  }, [searchParams])

  async function reload() {
    const sb = createClient()
    const { data } = await sb
      .from('invoices')
      .select('*, patient:patients(full_name, contact_number), payments(*)')
      .order('created_at', { ascending: false })
    if (data) setInvoices(data as any)
  }

  const filtered = invoices.filter(inv => {
    const matchFilter =
      filter === 'all'     ? true :
      filter === 'pending' ? ['issued', 'partial'].includes(inv.status) :
      filter === 'overdue' ? inv.status === 'overdue' :
      filter === 'paid'    ? inv.status === 'paid' : true
    const matchSearch = search
      ? (inv as any).patient?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        inv.or_number?.toLowerCase().includes(search.toLowerCase())
      : true
    return matchFilter && matchSearch
  })

  const total       = invoices.reduce((s, i) => s + Number(i.total_amount), 0)
  const collected   = invoices.reduce((s, i) => s + Number(i.amount_paid), 0)
  const outstanding = invoices.reduce((s, i) => s + Number(i.balance), 0)

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          ['Total Billed',    total,       'text-slate-900',   'bg-white'],
          ['Collected',       collected,   'text-emerald-600', 'bg-emerald-50'],
          ['Outstanding',     outstanding, 'text-red-600',     'bg-red-50'],
        ].map(([l, v, c, bg]) => (
          <div key={l as string} className={cn('border border-slate-200 rounded-xl p-5', bg as string)}>
            <div className="text-xs text-slate-500 font-medium mb-1">{l}</div>
            <div className={cn('text-2xl font-bold', c as string)}>{formatPHP(Number(v))}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {[['all','All'],['pending','Pending'],['overdue','Overdue'],['paid','Paid']].map(([val,lbl]) => (
            <button key={val} onClick={() => setFilter(val)}
              className={cn('px-3 py-1.5 text-sm font-semibold rounded-lg border transition-colors',
                filter === val ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 bg-white hover:border-blue-300 hover:text-blue-600')}>
              {lbl}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 focus-within:border-blue-400">
            <Search size={13} className="text-slate-400"/>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search patient or OR#…"
              className="outline-none text-sm w-44 placeholder:text-slate-400"/>
          </div>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700">
            <Plus size={15}/> Create Invoice
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {['OR Number','Patient','Date','Total','Paid','Balance','Mode','Status','Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(inv => (
              <tr key={inv.id} className="border-b border-slate-100 hover:bg-slate-50 group">
                <td className="px-4 py-3 text-sm font-mono font-semibold text-blue-600">{inv.or_number}</td>
                <td className="px-4 py-3 text-sm font-semibold text-slate-900">{(inv as any).patient?.full_name || '—'}</td>
                <td className="px-4 py-3 text-sm text-slate-500">{formatDate(inv.issued_at)}</td>
                <td className="px-4 py-3 text-sm font-bold">{formatPHP(Number(inv.total_amount))}</td>
                <td className="px-4 py-3 text-sm text-emerald-600 font-semibold">{formatPHP(Number(inv.amount_paid))}</td>
                <td className="px-4 py-3 text-sm font-bold text-red-600">
                  {Number(inv.balance) > 0 ? formatPHP(Number(inv.balance)) : <span className="text-emerald-600">Settled</span>}
                </td>
                <td className="px-4 py-3 text-xs text-slate-500 capitalize">{inv.payment_mode?.replace('_', ' ')}</td>
                <td className="px-4 py-3">
                  <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', STATUS_STYLE[inv.status])}>
                    {inv.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 items-center">
                    {Number(inv.balance) > 0 && (
                      <button onClick={() => setPayModal(inv)}
                        className="flex items-center gap-1 text-xs font-semibold text-emerald-600 border border-emerald-200 px-2 py-1 rounded-lg hover:bg-emerald-50 whitespace-nowrap">
                        <CreditCard size={11}/> Pay
                      </button>
                    )}
                    <button onClick={() => setShowOR(inv)}
                      className="flex items-center gap-1 text-xs font-semibold text-blue-600 border border-blue-200 px-2 py-1 rounded-lg hover:bg-blue-50 whitespace-nowrap">
                      <Printer size={11}/> OR
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={9} className="text-center py-16 text-slate-400">
                <div className="text-3xl mb-2">🧾</div>
                <p className="text-sm font-medium">No invoices found.</p>
                <button onClick={() => setShowCreate(true)} className="mt-3 text-xs font-semibold text-blue-600 hover:underline">
                  Create the first invoice →
                </button>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <CreateInvoiceModal
          onClose={() => setShowCreate(false)}
          onSaved={() => { setShowCreate(false); reload() }}
        />
      )}
      {showOR && <ORModal invoice={showOR} onClose={() => setShowOR(null)} />}
      {payModal && (
        <PaymentModal
          invoice={payModal}
          onClose={() => { setPayModal(null); reload() }}
        />
      )}
    </div>
  )
}

// ── CREATE INVOICE MODAL ──────────────────────────────────────
function CreateInvoiceModal({ onClose, onSaved, visitId, patientIdPrefill }: {
  onClose: () => void
  onSaved: () => void
  visitId?: string
  patientIdPrefill?: string
}) {
  const [loading, setLoading] = useState(false)
  const [patients, setPatients] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [showList, setShowList] = useState(false)
  const [patient, setPatient] = useState<any>(null)
  const [items, setItems] = useState([{ procedure_name: '', quantity: 1, unit_cost: 0 }])
  const [discount, setDiscount] = useState(0)
  const [paymentMode, setPaymentMode] = useState('cash')
  const [hmo, setHmo] = useState('')
  const [notes, setNotes] = useState('')
  const [templates, setTemplates] = useState<any[]>([])

  // Load procedure templates and prefill patient if provided
  useEffect(() => {
    async function load() {
      const sb = createClient()
      const [tRes] = await Promise.all([
        sb.from('procedure_templates').select('name, default_cost, category').order('name'),
      ])
      if (tRes.data) setTemplates(tRes.data)

      if (patientIdPrefill) {
        const { data } = await sb.from('patients').select('id,full_name,patient_type,contact_number').eq('id', patientIdPrefill).single()
        if (data) setPatient(data)
      }
    }
    load()
  }, [patientIdPrefill])

  // Search patients
  useEffect(() => {
    if (!search.trim()) { setPatients([]); setShowList(false); return }
    const t = setTimeout(async () => {
      const sb = createClient()
      const { data } = await sb.from('patients')
        .select('id,full_name,patient_type,contact_number')
        .eq('is_active', true).ilike('full_name', `%${search}%`).limit(8)
      setPatients(data || [])
      setShowList(true)
    }, 300)
    return () => clearTimeout(t)
  }, [search])

  const subtotal = items.reduce((s, i) => s + (Number(i.unit_cost) * Number(i.quantity)), 0)
  const discountAmt = Math.round(subtotal * discount / 100)
  const total = subtotal - discountAmt

  function addItem() { setItems(p => [...p, { procedure_name: '', quantity: 1, unit_cost: 0 }]) }
  function removeItem(i: number) { setItems(p => p.filter((_, idx) => idx !== i)) }
  function updateItem(i: number, k: string, v: string | number) {
    setItems(p => p.map((item, idx) => idx === i ? { ...item, [k]: v } : item))
  }
  function applyTemplate(i: number, tpl: any) {
    setItems(p => p.map((item, idx) => idx === i
      ? { ...item, procedure_name: tpl.name, unit_cost: Number(tpl.default_cost) || 0 }
      : item
    ))
  }

  async function save() {
    if (!patient) { toast.error('Select a patient'); return }
    if (items.some(i => !i.procedure_name.trim())) { toast.error('All items need a procedure name'); return }
    if (total <= 0) { toast.error('Total must be greater than 0'); return }

    setLoading(true)
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) { toast.error('Not authenticated'); setLoading(false); return }
    const { data: staff } = await sb.from('staff_profiles').select('clinic_id').eq('id', user.id).single()
    if (!staff) { toast.error('Staff profile not found'); setLoading(false); return }

    // Create invoice
    const { data: invoice, error: invErr } = await sb.from('invoices').insert({
      clinic_id:    staff.clinic_id,
      patient_id:   patient.id,
      visit_id:     visitId || null,
      subtotal,
      discount_pct: discount,
      payment_mode: paymentMode,
      hmo_provider: hmo || null,
      notes:        notes || null,
      status:       'issued',
      created_by:   user.id,
    }).select().single()

    if (invErr || !invoice) { toast.error(invErr?.message || 'Failed to create invoice'); setLoading(false); return }

    // Log audit
    await sb.from('audit_logs').insert({
      clinic_id: staff.clinic_id, user_id: user.id,
      user_name: staff.clinic_id, // will be resolved by trigger
      action: `Invoice created: ${invoice.or_number} — ${patient.full_name}`,
      resource_type: 'invoice', resource_id: invoice.id,
    }).maybeSingle()

    toast.success(`Invoice ${invoice.or_number} created — ₱${total.toLocaleString()}`)
    setLoading(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl my-4">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-slate-900">Create Invoice</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
        </div>

        <div className="space-y-5">
          {/* Patient */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Patient *</label>
            {patient ? (
              <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5">
                <div>
                  <div className="text-sm font-semibold">{patient.full_name}</div>
                  <div className="text-xs text-slate-500">{patient.patient_type === 'dental' ? '🦷' : '🐾'} {patient.patient_type} {patient.contact_number && `· ${patient.contact_number}`}</div>
                </div>
                <button onClick={() => { setPatient(null); setSearch('') }} className="text-slate-400 hover:text-red-500 font-bold ml-3">✕</button>
              </div>
            ) : (
              <div className="relative">
                <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2 focus-within:border-blue-400">
                  <Search size={13} className="text-slate-400"/>
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    onFocus={() => patients.length > 0 && setShowList(true)}
                    placeholder="Type patient name…"
                    className="flex-1 outline-none text-sm placeholder:text-slate-400"/>
                </div>
                {showList && patients.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-xl z-20 mt-1 max-h-40 overflow-y-auto">
                    {patients.map(p => (
                      <div key={p.id} onClick={() => { setPatient(p); setSearch(p.full_name); setShowList(false) }}
                        className="px-4 py-2.5 hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-0 text-sm font-semibold">
                        {p.full_name} <span className="text-xs font-normal text-slate-400">· {p.patient_type}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Line items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-600">Procedures / Services *</label>
              <button onClick={addItem} className="text-xs font-semibold text-blue-600 hover:underline">+ Add Line</button>
            </div>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="flex gap-2 items-start">
                  {/* Procedure name with template dropdown */}
                  <div className="flex-1 relative">
                    <input
                      value={item.procedure_name}
                      onChange={e => updateItem(i, 'procedure_name', e.target.value)}
                      placeholder="Procedure name (or pick from list below)"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                    />
                    {templates.length > 0 && !item.procedure_name && (
                      <select
                        onChange={e => { const t = templates.find(t => t.name === e.target.value); if (t) applyTemplate(i, t) }}
                        className="mt-1 w-full border border-slate-100 rounded-lg px-3 py-1.5 text-xs text-slate-500 outline-none bg-slate-50"
                        defaultValue="">
                        <option value="">— Quick pick from templates —</option>
                        {templates.map(t => (
                          <option key={t.name} value={t.name}>{t.name} (₱{Number(t.default_cost).toLocaleString()})</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div className="w-16">
                    <label className="block text-[10px] text-slate-400 mb-1">Qty</label>
                    <input type="number" min="1" value={item.quantity}
                      onChange={e => updateItem(i, 'quantity', Number(e.target.value))}
                      className="w-full border border-slate-200 rounded-lg px-2 py-2 text-sm outline-none focus:border-blue-400 text-center"/>
                  </div>
                  <div className="w-28">
                    <label className="block text-[10px] text-slate-400 mb-1">Unit Cost (₱)</label>
                    <input type="number" min="0" value={item.unit_cost}
                      onChange={e => updateItem(i, 'unit_cost', Number(e.target.value))}
                      className="w-full border border-slate-200 rounded-lg px-2 py-2 text-sm outline-none focus:border-blue-400"/>
                  </div>
                  <div className="w-24 pt-5 text-sm font-semibold text-slate-700 text-right">
                    ₱{(Number(item.unit_cost) * Number(item.quantity)).toLocaleString()}
                  </div>
                  {items.length > 1 && (
                    <button onClick={() => removeItem(i)} className="pt-5 text-slate-300 hover:text-red-400 font-bold">✕</button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Totals + payment mode */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Payment Mode</label>
                <select value={paymentMode} onChange={e => setPaymentMode(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400">
                  <option value="cash">Cash</option>
                  <option value="installment_3">Installment (3 months)</option>
                  <option value="installment_6">Installment (6 months)</option>
                  <option value="insurance">Insurance</option>
                  <option value="philhealth">PhilHealth</option>
                  <option value="hmo">HMO</option>
                </select>
              </div>
              {paymentMode === 'hmo' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">HMO Provider</label>
                  <input value={hmo} onChange={e => setHmo(e.target.value)} placeholder="Maxicare, MediCard…"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"/>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Discount (%)</label>
                <input type="number" min="0" max="100" value={discount} onChange={e => setDiscount(Number(e.target.value))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"/>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 resize-none"
                  placeholder="Insurance claim #, special instructions…"/>
              </div>
            </div>

            {/* Invoice summary */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2 text-sm self-start">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Invoice Summary</div>
              <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span className="font-semibold">₱{subtotal.toLocaleString()}</span></div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-600"><span>Discount ({discount}%)</span><span>-₱{discountAmt.toLocaleString()}</span></div>
              )}
              <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-base">
                <span>Total Due</span>
                <span className="text-blue-600">₱{total.toLocaleString()}</span>
              </div>
              <div className="text-xs text-slate-400 mt-1">Mode: {paymentMode.replace('_', ' ')}</div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button onClick={save} disabled={loading || !patient || total <= 0}
            className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? 'Creating Invoice…' : `Create Invoice — ₱${total.toLocaleString()}`}
          </button>
          <button onClick={onClose} className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50">Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ── OR MODAL ──────────────────────────────────────────────────
function ORModal({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl p-6 w-96 shadow-2xl">
        <div className="flex justify-between mb-4">
          <h2 className="text-base font-bold">Official Receipt</h2>
          <button onClick={onClose} className="text-slate-400 text-xl">✕</button>
        </div>
        <div className="font-mono text-xs space-y-1 bg-slate-50 rounded-xl p-4 border border-slate-200" id="print-or">
          <div className="text-center mb-3">
            <div className="text-sm font-bold font-sans">CliniCore Dental & Veterinary</div>
            <div className="text-slate-500">Main Branch</div>
            <div className="text-slate-500">{invoice.or_number} · {formatDate(invoice.issued_at)}</div>
          </div>
          <div className="border-t border-dashed border-slate-300 pt-2 space-y-1">
            <div className="flex justify-between"><span>Patient:</span><strong>{(invoice as any).patient?.full_name}</strong></div>
            <div className="flex justify-between"><span>Subtotal:</span><span>{formatPHP(Number(invoice.subtotal))}</span></div>
            {Number(invoice.discount_amount) > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount ({invoice.discount_pct}%):</span>
                <span>-{formatPHP(Number(invoice.discount_amount))}</span>
              </div>
            )}
          </div>
          <div className="border-t border-dashed border-slate-300 pt-2 space-y-1">
            <div className="flex justify-between font-bold text-sm"><span>TOTAL DUE:</span><span>{formatPHP(Number(invoice.total_amount))}</span></div>
            <div className="flex justify-between text-emerald-600"><span>Amount Paid:</span><span>{formatPHP(Number(invoice.amount_paid))}</span></div>
            {Number(invoice.balance) > 0 && (
              <div className="flex justify-between text-red-600 font-bold"><span>Balance:</span><span>{formatPHP(Number(invoice.balance))}</span></div>
            )}
          </div>
          <div className="border-t border-dashed border-slate-300 pt-2 space-y-1">
            <div className="flex justify-between"><span>Mode:</span><span>{invoice.payment_mode?.replace('_', ' ')}</span></div>
            {invoice.hmo_provider && <div className="flex justify-between"><span>HMO:</span><span>{invoice.hmo_provider}</span></div>}
          </div>
          <div className="text-center text-slate-400 pt-2">Thank you for choosing CliniCore!</div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={() => window.print()} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-blue-700">🖨 Print</button>
          <button onClick={onClose} className="flex-1 border border-slate-200 py-2 rounded-lg text-sm font-semibold hover:bg-slate-50">Close</button>
        </div>
      </div>
    </div>
  )
}

// ── PAYMENT MODAL ─────────────────────────────────────────────
function PaymentModal({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const [amount, setAmount] = useState(String(invoice.balance))
  const [method, setMethod] = useState('cash')
  const [ref, setRef] = useState('')
  const [loading, setLoading] = useState(false)

  async function save() {
    const n = Number(amount)
    if (!n || n <= 0) { toast.error('Enter a valid amount'); return }
    if (n > Number(invoice.balance)) { toast.error(`Amount exceeds balance of ₱${Number(invoice.balance).toLocaleString()}`); return }

    setLoading(true)
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) { toast.error('Not authenticated'); setLoading(false); return }
    const { data: staff } = await sb.from('staff_profiles').select('clinic_id').eq('id', user.id).single()

    const { error } = await sb.from('payments').insert({
      invoice_id:       invoice.id,
      clinic_id:        staff?.clinic_id,
      amount:           n,
      method,
      reference_number: ref || null,
      received_by:      user.id,
    })

    if (error) { toast.error(error.message); setLoading(false); return }
    toast.success(`Payment of ₱${n.toLocaleString()} recorded`)
    setLoading(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl p-6 w-80 shadow-2xl">
        <div className="flex justify-between mb-4">
          <h2 className="text-base font-bold">Record Payment</h2>
          <button onClick={onClose} className="text-slate-400 text-xl">✕</button>
        </div>
        <div className="bg-slate-50 rounded-xl p-3 mb-4 text-sm">
          <div className="font-semibold text-slate-800">{(invoice as any).patient?.full_name}</div>
          <div className="text-slate-500">{invoice.or_number}</div>
          <div className="flex justify-between mt-1">
            <span className="text-slate-500">Outstanding balance:</span>
            <span className="font-bold text-red-600">{formatPHP(Number(invoice.balance))}</span>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Amount (₱)</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"/>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Payment Method</label>
            <select value={method} onChange={e => setMethod(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400">
              {['cash','gcash','bank_transfer','card','insurance'].map(m => (
                <option key={m} value={m}>{m.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Reference # (optional)</label>
            <input value={ref} onChange={e => setRef(e.target.value)}
              placeholder="GCash ref, bank ref, check #…"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"/>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={save} disabled={loading}
            className="flex-1 bg-emerald-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60">
            {loading ? 'Saving…' : 'Record Payment'}
          </button>
          <button onClick={onClose} className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50">Cancel</button>
        </div>
      </div>
    </div>
  )
}
