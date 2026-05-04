'use client'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Search, Smile } from 'lucide-react'
import { useState } from 'react'

const STATUS_COLOR: Record<string, string> = {
  healthy:    'bg-emerald-400',
  treated:    'bg-blue-400',
  affected:   'bg-red-400',
  crown:      'bg-amber-400',
  missing:    'bg-slate-300',
  implant:    'bg-purple-400',
  bridge:     'bg-indigo-400',
  root_canal: 'bg-orange-400',
}

function ChartMiniMap({ teeth }: { teeth: { tooth_number: number; status: string }[] }) {
  const map = Object.fromEntries(teeth.map(t => [t.tooth_number, t.status]))
  const rows = [
    [18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28],
    [48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38],
  ]
  return (
    <div className="flex flex-col gap-0.5">
      {rows.map((row, ri) => (
        <div key={ri} className="flex gap-0.5">
          {row.map(n => (
            <div
              key={n}
              title={`#${n} — ${map[n] || 'healthy'}`}
              className={cn('w-2.5 h-3 rounded-sm', STATUS_COLOR[map[n] || 'healthy'] || 'bg-emerald-400')}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export default function DentalIndexView({ patients }: { patients: any[] }) {
  const router = useRouter()
  const [search, setSearch] = useState('')

  const filtered = patients.filter(p =>
    p.full_name.toLowerCase().includes(search.toLowerCase()) ||
    p.contact_number?.includes(search)
  )

  function getChartSummary(teeth: { tooth_number: number; status: string }[]) {
    const counts: Record<string, number> = {}
    teeth.forEach(t => { counts[t.status] = (counts[t.status] || 0) + 1 })
    const issues = Object.entries(counts)
      .filter(([s]) => s !== 'healthy')
      .map(([s, n]) => `${n} ${s.replace('_', ' ')}`)
    return issues.length > 0 ? issues.join(', ') : 'All healthy'
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 w-72 focus-within:border-blue-400 transition-all">
          <Search size={14} className="text-slate-400 flex-shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search dental patients…"
            className="text-sm outline-none flex-1 text-slate-800 placeholder:text-slate-400"
          />
        </div>
        <button
          onClick={() => router.push('/patients')}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700"
        >
          + Add Dental Patient
        </button>
      </div>

      <div className="text-xs text-slate-500 font-medium">{filtered.length} dental patients</div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {['Patient','Contact','Allergies','Chart Overview','Issues',''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => {
              const teeth = p.dental_charts || []
              const summary = getChartSummary(teeth)
              const hasIssues = summary !== 'All healthy'
              return (
                <tr key={p.id} className="border-b border-slate-100 hover:bg-blue-50/40 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {p.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 text-sm">{p.full_name}</div>
                        <div className="text-xs text-slate-400">{p.sex} · {p.date_of_birth ? new Date(p.date_of_birth).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : 'No DOB'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{p.contact_number || '—'}</td>
                  <td className="px-4 py-3">
                    {p.allergies
                      ? <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded">⚠️ {p.allergies}</span>
                      : <span className="text-xs text-slate-400">NKDA</span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    <ChartMiniMap teeth={teeth} />
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'text-xs font-semibold px-2 py-0.5 rounded-full',
                      hasIssues ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                    )}>
                      {hasIssues ? `⚠️ ${summary}` : '✓ All healthy'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => router.push(`/dental/${p.id}`)}
                      className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 whitespace-nowrap"
                    >
                      <Smile size={13} /> Open Chart
                    </button>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-12 text-slate-400 text-sm">
                  No dental patients found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
