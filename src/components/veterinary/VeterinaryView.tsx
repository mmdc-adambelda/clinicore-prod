'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Patient } from '@/types'
import { cn, formatDate } from '@/lib/utils'
import { Search } from 'lucide-react'

const SPECIES_EMOJI: Record<string,string> = { Dog:'🐕', Cat:'🐈', Rabbit:'🐇', Bird:'🦜', Hamster:'🐹' }
const VACC_STYLE: Record<string,string> = {
  up_to_date: 'bg-emerald-100 text-emerald-700',
  due_soon:   'bg-amber-100 text-amber-700',
  overdue:    'bg-red-100 text-red-700',
}

export default function VeterinaryView({ patients }: { patients: Patient[] }) {
  const router = useRouter()
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  const filtered = patients.filter(p => {
    const pet = p.pet_profile
    const matchSearch = p.full_name.toLowerCase().includes(search.toLowerCase()) ||
      pet?.pet_name?.toLowerCase().includes(search.toLowerCase()) || false
    const matchFilter =
      filter === 'all' ? true :
      filter === 'dog' ? pet?.species === 'Dog' :
      filter === 'cat' ? pet?.species === 'Cat' :
      filter === 'due' ? pet?.vaccination_status !== 'up_to_date' :
      filter === 'overdue' ? pet?.vaccination_status === 'overdue' : true
    return matchSearch && matchFilter
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {[
            ['all',     'All Pets'],
            ['dog',     '🐕 Dogs'],
            ['cat',     '🐈 Cats'],
            ['due',     '💉 Vaccination Due'],
            ['overdue', '⚠️ Overdue'],
          ].map(([val, lbl]) => (
            <button
              key={val}
              onClick={() => setFilter(val)}
              className={cn(
                'px-3 py-1.5 text-sm font-semibold rounded-lg border transition-colors',
                filter === val
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-purple-300 hover:text-purple-600'
              )}
            >
              {lbl}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 focus-within:border-purple-400 transition-all">
            <Search size={14} className="text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search pets or owners…"
              className="text-sm outline-none w-40 text-slate-800 placeholder:text-slate-400"
            />
          </div>
          <button
            onClick={() => router.push('/patients')}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-purple-700"
          >
            + Add Pet Patient
          </button>
        </div>
      </div>

      <div className="text-xs text-slate-500 font-medium">{filtered.length} pets</div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(p => {
          const pet = p.pet_profile
          const emoji = pet ? (SPECIES_EMOJI[pet.species] || '🐾') : '🐾'
          const vaccStatus = pet?.vaccination_status || 'up_to_date'
          return (
            <div
              key={p.id}
              onClick={() => router.push(`/veterinary/${p.id}`)}
              className="bg-white border border-slate-200 rounded-xl p-5 flex gap-4 cursor-pointer hover:border-purple-300 hover:shadow-md transition-all group"
            >
              <div className="w-14 h-14 rounded-2xl bg-purple-50 flex items-center justify-center text-3xl flex-shrink-0 group-hover:bg-purple-100 transition-colors">
                {emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-bold text-slate-900">{pet?.pet_name || p.full_name}</span>
                  <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', VACC_STYLE[vaccStatus])}>
                    {vaccStatus === 'up_to_date' ? '✓ Vaccinated' : vaccStatus === 'due_soon' ? '📅 Due soon' : '⚠️ Overdue'}
                  </span>
                </div>
                <div className="text-xs text-slate-500">{pet?.species}{pet?.breed ? ` · ${pet.breed}` : ''}{pet?.weight_kg ? ` · ${pet.weight_kg}kg` : ''}</div>
                <div className="text-xs text-slate-400 mt-0.5">👤 {p.full_name}</div>
                {p.contact_number && <div className="text-xs text-slate-400">📱 {p.contact_number}</div>}
                <div className="text-xs text-slate-400">
                  💉 Next: {pet?.next_vaccination_due ? formatDate(pet.next_vaccination_due) : 'Not set'}
                </div>
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div className="col-span-3 text-center py-16 text-slate-400">
            <div className="text-4xl mb-3">🐾</div>
            <p className="text-sm font-medium">No pets found.</p>
            <p className="text-xs mt-1">Try changing the filter or add a new veterinary patient.</p>
          </div>
        )}
      </div>
    </div>
  )
}
