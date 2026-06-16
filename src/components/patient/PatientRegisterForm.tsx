'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import Link from 'next/link'
import Image from 'next/image'

interface Clinic {
  id: string
  name: string
  branch_name: string
}

export default function PatientRegisterForm({ clinics }: { clinics: Clinic[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    full_name: '', email: '', password: '', phone: '',
    date_of_birth: '', sex: '',
    clinic_id: clinics[0]?.id || '',
  })

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return }
    if (!form.clinic_id) { toast.error('Please select a clinic'); return }
    setLoading(true)

    const res = await fetch('/api/patient/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName:    form.full_name,
        email:       form.email,
        password:    form.password,
        phone:       form.phone || undefined,
        dateOfBirth: form.date_of_birth || undefined,
        sex:         form.sex || undefined,
        clinicId:    form.clinic_id,
      }),
    })
    const json = await res.json()

    if (!res.ok) {
      toast.error(json.error || 'Registration failed')
      setLoading(false)
      return
    }

    // Auto sign-in — the account is pre-confirmed server-side
    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: form.email, password: form.password,
    })
    if (signInError) {
      toast.success('Account created! Please sign in.')
      router.push('/login')
      return
    }

    toast.success('Welcome to CliniCore!')
    router.push('/patient/book')
    router.refresh()
  }

  return (
    <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-8">
      <div className="text-center mb-6">
        <div className="w-14 h-14 rounded-xl overflow-hidden mx-auto mb-3 bg-white">
          <Image src="/logo.png" alt="CliniCore" width={56} height={56} className="w-full h-full object-contain" />
        </div>
        <h1 className="text-xl font-bold text-white">Create your patient account</h1>
        <p className="text-slate-400 text-xs mt-1">Book and manage your dental visits online</p>
      </div>

      {clinics.length === 0 ? (
        <p className="text-center text-sm text-slate-400 py-6">
          No clinics are available to register with yet. Please contact your clinic directly.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Full name</label>
            <input
              type="text" value={form.full_name} onChange={set('full_name')}
              required placeholder="Juan dela Cruz"
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder:text-slate-500 outline-none focus:border-blue-400 text-sm transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Email address</label>
            <input
              type="email" value={form.email} onChange={set('email')}
              required placeholder="you@example.com"
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder:text-slate-500 outline-none focus:border-blue-400 text-sm transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Password (min 8 chars)</label>
            <input
              type="password" value={form.password} onChange={set('password')}
              required placeholder="••••••••"
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder:text-slate-500 outline-none focus:border-blue-400 text-sm transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Phone number</label>
            <input
              type="tel" value={form.phone} onChange={set('phone')}
              placeholder="+63 9XX XXX XXXX"
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder:text-slate-500 outline-none focus:border-blue-400 text-sm transition-all"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Date of birth</label>
              <input
                type="date" value={form.date_of_birth} onChange={set('date_of_birth')}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder:text-slate-500 outline-none focus:border-blue-400 text-sm transition-all [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Sex</label>
              <select
                value={form.sex} onChange={set('sex')}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white outline-none focus:border-blue-400 text-sm transition-all [color-scheme:dark]"
              >
                <option value="" className="text-slate-900">Select…</option>
                <option value="male" className="text-slate-900">Male</option>
                <option value="female" className="text-slate-900">Female</option>
                <option value="other" className="text-slate-900">Other</option>
              </select>
            </div>
          </div>

          {clinics.length > 1 && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Clinic</label>
              <select
                value={form.clinic_id} onChange={set('clinic_id')} required
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white outline-none focus:border-blue-400 text-sm transition-all [color-scheme:dark]"
              >
                {clinics.map(c => (
                  <option key={c.id} value={c.id} className="text-slate-900">
                    {c.name} — {c.branch_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="submit" disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm mt-2"
          >
            {loading ? 'Creating account…' : 'Create Patient Account'}
          </button>
        </form>
      )}

      <p className="text-center text-xs text-slate-500 mt-5">
        Already have an account?{' '}
        <Link href="/login" className="text-blue-400 hover:text-blue-300">Sign in</Link>
      </p>
    </div>
  )
}
