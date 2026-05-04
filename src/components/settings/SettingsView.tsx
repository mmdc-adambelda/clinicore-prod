'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { StaffProfile, AuditLog } from '@/types'
import { formatDateTime } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function SettingsView({ staff, auditLogs }: { staff: StaffProfile | null; auditLogs: AuditLog[] }) {
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    full_name: staff?.full_name || '',
    phone: staff?.phone || '',
    specialty: staff?.specialty || '',
    license_number: staff?.license_number || '',
  })

  function exportAuditCSV() {
    if (auditLogs.length === 0) { toast.error('No audit log entries to export'); return }

    const headers = ['Timestamp','User','Action','Resource Type','Resource ID']
    const rows = auditLogs.map(log => [
      `"${formatDateTime(log.created_at)}"`,
      `"${log.user_name}"`,
      `"${log.action.replace(/"/g, '""')}"`,
      `"${log.resource_type}"`,
      `"${log.resource_id || ''}"`,
    ])
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success(`Exported ${auditLogs.length} audit log entries`)
  }

  async function saveProfile() {
    if (!staff) return
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('staff_profiles')
      .update({
        full_name: form.full_name,
        phone: form.phone || null,
        specialty: form.specialty || null,
        license_number: form.license_number || null,
      })
      .eq('id', staff.id)
    if (error) { toast.error(error.message) }
    else { toast.success('Profile updated'); setEditMode(false) }
    setSaving(false)
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* RBAC Table */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Roles & Permissions (RBAC)</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {['Role','Clinical','Billing','Admin','Reports'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-bold text-slate-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['Dentist / Vet',  '✅ Full',      '👁 View',   '❌',        '✅ Own'],
                ['Front Desk',     '📅 Schedule',  '✅ Full',   '❌',        '✅ Limited'],
                ['Admin / Owner',  '✅ Full',      '✅ Full',   '✅ Full',   '✅ Full'],
                ['Receptionist',   '👁 View',      '👁 View',   '❌',        '❌'],
              ].map(([r, ...perms]) => (
                <tr key={r} className="border-b border-slate-100">
                  <td className="px-4 py-2.5 font-semibold">{r}</td>
                  {perms.map((p, i) => <td key={i} className="px-4 py-2.5 text-xs">{p}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Audit Log */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Audit Log</h2>
            <button
              onClick={exportAuditCSV}
              className="flex items-center gap-1.5 text-xs text-blue-600 font-semibold border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
            >
              📥 Export CSV
            </button>
          </div>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {auditLogs.map(log => (
              <div key={log.id} className="flex gap-3 bg-slate-50 rounded-lg px-3 py-2 text-xs">
                <span className="text-slate-400 whitespace-nowrap flex-shrink-0">{formatDateTime(log.created_at)}</span>
                <span className="font-semibold text-slate-800 flex-shrink-0">{log.user_name}</span>
                <span className="text-slate-600 truncate">{log.action}</span>
              </div>
            ))}
            {auditLogs.length === 0 && (
              <div className="text-slate-400 text-xs text-center py-6">No log entries yet. Actions like patient creation, billing, and stock adjustments are logged here.</div>
            )}
          </div>
        </div>

        {/* Tech Stack */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4">Production Stack</h2>
          <div className="space-y-2.5">
            {[
              ['Frontend',     'Next.js 14 + TailwindCSS + TypeScript'],
              ['Backend API',  'Next.js API Routes (serverless on Vercel)'],
              ['Database',     'Supabase PostgreSQL + Row Level Security'],
              ['Auth',         'Supabase Auth (email/password + JWT)'],
              ['File Storage', 'Supabase Storage (X-rays, attachments)'],
              ['AI Engine',    'Claude API (Anthropic) via /api/ai'],
              ['Hosting',      'Vercel (auto-deploy from GitHub)'],
              ['Realtime',     'Supabase Realtime subscriptions'],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between text-sm">
                <span className="text-slate-500 font-medium">{k}</span>
                <span className="font-semibold text-slate-800 text-right text-xs max-w-[220px]">{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Current User / Edit Profile */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">My Profile</h2>
            {!editMode && (
              <button onClick={() => setEditMode(true)} className="text-xs font-semibold text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50">
                ✏️ Edit
              </button>
            )}
          </div>

          {staff && (
            editMode ? (
              <div className="space-y-3">
                {[
                  { k:'full_name',      label:'Full Name',   ph:'Dr. Juan dela Cruz' },
                  { k:'phone',          label:'Phone',       ph:'+63 917 000 0000' },
                  { k:'specialty',      label:'Specialty',   ph:'General Dentistry' },
                  { k:'license_number', label:'License #',   ph:'PRC-12345' },
                ].map(({ k, label, ph }) => (
                  <div key={k}>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
                    <input
                      value={(form as any)[k]}
                      onChange={e => setForm(f => ({...f, [k]: e.target.value}))}
                      placeholder={ph}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                    />
                  </div>
                ))}
                <div className="flex gap-2 mt-2">
                  <button onClick={saveProfile} disabled={saving} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-60">
                    {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                  <button onClick={() => setEditMode(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5 text-sm">
                {[
                  ['Full Name',   staff.full_name],
                  ['Role',        staff.role.replace('_', ' ')],
                  ['Specialty',   staff.specialty || '—'],
                  ['License #',   staff.license_number || '—'],
                  ['Phone',       staff.phone || '—'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-slate-500">{k}</span>
                    <span className="font-semibold capitalize">{v}</span>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}
