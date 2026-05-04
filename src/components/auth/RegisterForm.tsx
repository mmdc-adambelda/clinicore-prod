'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import Link from 'next/link'

export default function RegisterForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    full_name: '', email: '', password: '', clinic_name: '', branch_name: 'Main Branch', phone: '',
  })

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return }
    setLoading(true)
    const supabase = createClient()

    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.full_name } },
    })
    if (authError || !authData.user) {
      toast.error(authError?.message || 'Registration failed')
      setLoading(false)
      return
    }

    // 2. Create clinic
    const { data: clinic, error: clinicErr } = await supabase
      .from('clinics')
      .insert({ name: form.clinic_name, branch_name: form.branch_name, phone: form.phone, type: 'both' })
      .select().single()

    if (clinicErr || !clinic) {
      toast.error('Failed to create clinic')
      setLoading(false)
      return
    }

    // 3. Create staff profile with admin role
    await supabase.from('staff_profiles').insert({
      id: authData.user.id,
      clinic_id: clinic.id,
      full_name: form.full_name,
      role: 'admin',
    })

    toast.success('Account created! Check your email to verify.')
    router.push('/login')
  }

  return (
    <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-8">
      <div className="text-center mb-6">
        <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-lg font-bold text-white mx-auto mb-3">CC</div>
        <h1 className="text-xl font-bold text-white">Create your clinic account</h1>
        <p className="text-slate-400 text-xs mt-1">Set up CliniCore for your practice</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {[
          { k: 'full_name',    label: 'Your full name',         ph: 'Dr. Juan dela Cruz', type: 'text' },
          { k: 'email',        label: 'Email address',          ph: 'dr@clinic.com',       type: 'email' },
          { k: 'password',     label: 'Password (min 8 chars)', ph: '••••••••',            type: 'password' },
          { k: 'clinic_name',  label: 'Clinic / Practice name', ph: 'CliniCore Dental',    type: 'text' },
          { k: 'branch_name',  label: 'Branch name',            ph: 'Main Branch',         type: 'text' },
          { k: 'phone',        label: 'Clinic phone',           ph: '+63 2 8888 0000',     type: 'tel' },
        ].map(({ k, label, ph, type }) => (
          <div key={k}>
            <label className="block text-xs font-medium text-slate-300 mb-1">{label}</label>
            <input
              type={type} value={form[k as keyof typeof form]} onChange={set(k)}
              required placeholder={ph}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder:text-slate-500 outline-none focus:border-blue-400 text-sm transition-all"
            />
          </div>
        ))}

        <button
          type="submit" disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm mt-2"
        >
          {loading ? 'Creating account…' : 'Create Clinic Account'}
        </button>
      </form>

      <p className="text-center text-xs text-slate-500 mt-5">
        Already have an account?{' '}
        <Link href="/login" className="text-blue-400 hover:text-blue-300">Sign in</Link>
      </p>
    </div>
  )
}
