import { getCurrentPatient } from '@/lib/db'
import { redirect } from 'next/navigation'

export default async function PatientProfilePage() {
  const profile = await getCurrentPatient()
  if (!profile) redirect('/login')

  const p = profile.patient
  const fields = [
    { label: 'Full Name',         value: p.full_name },
    { label: 'Date of Birth',     value: p.date_of_birth ?? '—' },
    { label: 'Sex',               value: p.sex ? p.sex.charAt(0).toUpperCase() + p.sex.slice(1) : '—' },
    { label: 'Contact Number',    value: p.contact_number ?? '—' },
    { label: 'Email',             value: p.email ?? '—' },
    { label: 'Address',           value: p.address ?? '—' },
    { label: 'Allergies',         value: p.allergies ?? '—' },
    { label: 'Medical History',   value: p.medical_history ?? '—' },
    { label: 'Emergency Contact', value: p.emergency_contact ?? '—' },
    { label: 'Emergency Phone',   value: p.emergency_phone ?? '—' },
  ]

  return (
    <div className="max-w-lg mx-auto p-4">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-xl font-bold text-white">
          {p.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800">{p.full_name}</h2>
          <p className="text-sm text-slate-500 capitalize">Dental Patient</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
        {fields.map(({ label, value }) => (
          <div key={label} className="flex px-4 py-3">
            <span className="text-xs font-semibold text-slate-400 w-36 flex-shrink-0 pt-0.5">{label}</span>
            <span className="text-sm text-slate-700 flex-1">{value}</span>
          </div>
        ))}
      </div>

      <p className="text-xs text-slate-400 text-center mt-4">
        To update your information, please contact the clinic.
      </p>
    </div>
  )
}
