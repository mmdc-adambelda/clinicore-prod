'use client'
import { useState, useEffect } from 'react'
import { Calendar, Clock, ChevronRight, CheckCircle, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Dentist {
  id: string
  full_name: string
  specialty: string | null
}

interface UpcomingAppt {
  id: string
  scheduled_at: string
  procedure_type: string | null
  chief_complaint: string | null
  status: string
  staff: { full_name: string; specialty: string | null } | null
}

interface Props {
  patientId: string
  clinicId: string
  dentists: Dentist[]
  upcomingAppointments: UpcomingAppt[]
}

const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00',
  '13:00', '14:00', '15:00', '16:00', '17:00',
]

function fmt12(t: string) {
  const [h, m] = t.split(':').map(Number)
  const ap = h < 12 ? 'AM' : 'PM'
  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${h12}:${String(m).padStart(2, '0')} ${ap}`
}

function fmtDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-PH', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })
}

function fmtApptDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtApptTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })
}

const STATUS_STYLES: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  confirmed:  'bg-green-100 text-green-700',
  in_chair:   'bg-purple-100 text-purple-700',
  completed:  'bg-slate-100 text-slate-600',
  cancelled:  'bg-red-100 text-red-600',
  no_show:    'bg-amber-100 text-amber-700',
}

type Step = 'dentist' | 'datetime' | 'confirm'
type Tab  = 'book' | 'visits'

export default function PatientBookingView({ patientId, clinicId, dentists, upcomingAppointments }: Props) {
  const [tab,  setTab]  = useState<Tab>('book')
  const [step, setStep] = useState<Step>('dentist')

  const [selectedDentist, setSelectedDentist] = useState<Dentist | null>(null)
  const [selectedDate,    setSelectedDate]    = useState('')
  const [selectedTime,    setSelectedTime]    = useState('')
  const [bookedSlots,     setBookedSlots]     = useState<string[]>([])
  const [loadingSlots,    setLoadingSlots]    = useState(false)

  const [chiefComplaint, setChiefComplaint] = useState('')
  const [procedureType,  setProcedureType]  = useState('')
  const [submitting,     setSubmitting]     = useState(false)

  // Min date: tomorrow
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minDate = tomorrow.toISOString().split('T')[0]

  // Fetch booked slots whenever dentist or date changes
  useEffect(() => {
    if (!selectedDentist || !selectedDate) { setBookedSlots([]); return }
    setLoadingSlots(true)
    setSelectedTime('')

    fetch(`/api/patient/slots?dentistId=${selectedDentist.id}&date=${selectedDate}`)
      .then(r => r.json())
      .then(({ slots }) => setBookedSlots(slots || []))
      .catch(() => setBookedSlots([]))
      .finally(() => setLoadingSlots(false))
  }, [selectedDentist, selectedDate])

  function resetForm() {
    setStep('dentist')
    setSelectedDentist(null)
    setSelectedDate('')
    setSelectedTime('')
    setChiefComplaint('')
    setProcedureType('')
  }

  async function handleBook() {
    if (!selectedDentist || !selectedDate || !selectedTime) return
    setSubmitting(true)

    try {
      const [h, m] = selectedTime.split(':').map(Number)
      const d = new Date(selectedDate + 'T00:00:00')
      d.setHours(h, m, 0, 0)

      const res = await fetch('/api/patient/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          clinicId,
          dentistId:      selectedDentist.id,
          scheduledAt:    d.toISOString(),
          chiefComplaint: chiefComplaint || null,
          procedureType:  procedureType  || null,
        }),
      })

      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error || 'Booking failed')
      }

      toast.success('Appointment booked! We\'ll confirm shortly.')
      resetForm()
    } catch (e: any) {
      toast.error(e.message || 'Booking failed')
    } finally {
      setSubmitting(false)
    }
  }

  const stepIndex = (['dentist', 'datetime', 'confirm'] as Step[]).indexOf(step)
  const stepLabels = ['Dentist', 'Date & Time', 'Confirm']

  return (
    <div className="max-w-lg mx-auto">
      {/* Tab bar */}
      <div className="flex border-b border-slate-200 bg-white sticky top-14 z-20">
        {([['book', 'Book Appointment'], ['visits', 'My Visits']] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'flex-1 py-3.5 text-sm font-semibold transition-colors border-b-2',
              tab === key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── BOOK TAB ── */}
      {tab === 'book' && (
        <div className="p-4 space-y-5">

          {/* Progress indicator */}
          <div className="flex items-center gap-1">
            {stepLabels.map((label, i) => {
              const done   = i < stepIndex
              const active = i === stepIndex
              return (
                <div key={label} className="flex items-center gap-1 flex-1 last:flex-none">
                  <div className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 transition-colors',
                    done   ? 'bg-green-500 text-white'
                    : active ? 'bg-blue-600 text-white'
                    : 'bg-slate-200 text-slate-500',
                  )}>
                    {done ? '✓' : i + 1}
                  </div>
                  <span className={cn(
                    'text-[10px] font-medium flex-1 truncate',
                    active ? 'text-blue-600' : 'text-slate-400',
                  )}>
                    {label}
                  </span>
                  {i < 2 && <div className={cn('w-4 h-px flex-shrink-0', done ? 'bg-green-400' : 'bg-slate-200')} />}
                </div>
              )
            })}
          </div>

          {/* ── Step 1: Pick dentist ── */}
          {step === 'dentist' && (
            <div>
              <h2 className="text-base font-bold text-slate-800 mb-3">Choose your dentist</h2>
              {dentists.length === 0 ? (
                <div className="text-center py-10 text-sm text-slate-500">
                  <AlertCircle size={32} className="mx-auto mb-2 text-slate-300" />
                  No dentists available at the moment.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {dentists.map(d => (
                    <button
                      key={d.id}
                      onClick={() => { setSelectedDentist(d); setStep('datetime') }}
                      className="w-full flex items-center gap-3.5 p-4 bg-white rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-sm active:scale-[0.99] transition-all text-left"
                    >
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                        {d.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 text-sm">Dr. {d.full_name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{d.specialty || 'General Dentist'}</p>
                      </div>
                      <ChevronRight size={16} className="text-slate-400 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Step 2: Pick date + time ── */}
          {step === 'datetime' && selectedDentist && (
            <div>
              <button
                onClick={() => { setStep('dentist'); setSelectedDate(''); setSelectedTime('') }}
                className="flex items-center gap-1 text-xs text-blue-600 font-semibold mb-4"
              >
                ← Back
              </button>

              {/* Selected dentist card */}
              <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-2xl p-3 mb-5">
                <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                  {selectedDentist.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Dr. {selectedDentist.full_name}</p>
                  <p className="text-xs text-slate-500">{selectedDentist.specialty || 'General Dentist'}</p>
                </div>
              </div>

              <h2 className="text-sm font-bold text-slate-700 mb-2">Select date</h2>
              <input
                type="date"
                min={minDate}
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all mb-5"
              />

              {selectedDate && (
                <>
                  <h2 className="text-sm font-bold text-slate-700 mb-2">
                    Available times · {fmtDate(selectedDate)}
                  </h2>
                  {loadingSlots ? (
                    <div className="flex justify-center py-8">
                      <Loader2 size={22} className="animate-spin text-blue-500" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {TIME_SLOTS.map(slot => {
                        const booked   = bookedSlots.includes(slot)
                        const selected = selectedTime === slot
                        return (
                          <button
                            key={slot}
                            disabled={booked}
                            onClick={() => setSelectedTime(slot)}
                            className={cn(
                              'py-3 rounded-xl text-[13px] font-semibold border transition-all active:scale-95',
                              booked
                                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed line-through'
                                : selected
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                  : 'bg-white text-slate-700 border-slate-200 hover:border-blue-400 hover:bg-blue-50',
                            )}
                          >
                            {fmt12(slot)}
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {selectedTime && (
                    <button
                      onClick={() => setStep('confirm')}
                      className="w-full mt-5 bg-blue-600 text-white rounded-2xl py-3.5 font-bold text-sm hover:bg-blue-700 active:scale-[0.99] transition-all"
                    >
                      Continue →
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── Step 3: Confirm ── */}
          {step === 'confirm' && selectedDentist && selectedDate && selectedTime && (
            <div>
              <button
                onClick={() => setStep('datetime')}
                className="flex items-center gap-1 text-xs text-blue-600 font-semibold mb-4"
              >
                ← Back
              </button>

              {/* Appointment summary */}
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-4 text-white mb-5">
                <p className="text-xs font-semibold uppercase tracking-wider opacity-70 mb-3">Appointment Summary</p>
                <div className="space-y-2.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                      {selectedDentist.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <p className="font-bold text-sm">Dr. {selectedDentist.full_name}</p>
                      <p className="text-xs opacity-70">{selectedDentist.specialty || 'General Dentist'}</p>
                    </div>
                  </div>
                  <div className="border-t border-white/20 pt-2.5 space-y-1.5">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar size={13} className="opacity-70" />
                      <span>{fmtDate(selectedDate)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock size={13} className="opacity-70" />
                      <span>{fmt12(selectedTime)} · 60 minutes</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Optional details */}
              <div className="space-y-3.5 mb-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Chief Complaint
                    <span className="font-normal text-slate-400 ml-1">(optional)</span>
                  </label>
                  <textarea
                    rows={3}
                    value={chiefComplaint}
                    onChange={e => setChiefComplaint(e.target.value)}
                    placeholder="e.g. Toothache, tooth cleaning, checkup…"
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Procedure
                    <span className="font-normal text-slate-400 ml-1">(optional)</span>
                  </label>
                  <select
                    value={procedureType}
                    onChange={e => setProcedureType(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                  >
                    <option value="">Select procedure</option>
                    <option value="Dental Checkup">Dental Checkup</option>
                    <option value="Teeth Cleaning">Teeth Cleaning</option>
                    <option value="Tooth Extraction">Tooth Extraction</option>
                    <option value="Dental Filling">Dental Filling</option>
                    <option value="Root Canal Treatment">Root Canal Treatment</option>
                    <option value="Orthodontic Consultation">Orthodontic Consultation</option>
                    <option value="Teeth Whitening">Teeth Whitening</option>
                    <option value="Dentures">Dentures</option>
                    <option value="Dental Implant">Dental Implant</option>
                    <option value="Dental X-Ray">Dental X-Ray</option>
                    <option value="Oral Prophylaxis">Oral Prophylaxis</option>
                    <option value="Veneers">Veneers</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleBook}
                disabled={submitting}
                className="w-full bg-blue-600 text-white rounded-2xl py-4 font-bold text-sm hover:bg-blue-700 disabled:opacity-60 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
              >
                {submitting ? (
                  <><Loader2 size={17} className="animate-spin" /> Booking…</>
                ) : (
                  <><CheckCircle size={17} /> Confirm Appointment</>
                )}
              </button>

              <p className="text-center text-xs text-slate-400 mt-3">
                You'll receive a confirmation once the clinic approves.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── VISITS TAB ── */}
      {tab === 'visits' && (
        <div className="p-4">
          <h2 className="text-base font-bold text-slate-800 mb-4">Upcoming Appointments</h2>

          {upcomingAppointments.length === 0 ? (
            <div className="text-center py-14">
              <Calendar size={44} className="text-slate-200 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-600">No upcoming appointments</p>
              <p className="text-xs text-slate-400 mt-1 mb-4">Book your first visit with a dentist</p>
              <button
                onClick={() => setTab('book')}
                className="text-sm text-blue-600 font-bold border border-blue-200 px-5 py-2 rounded-xl hover:bg-blue-50 transition-colors"
              >
                Book Now →
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingAppointments.map(appt => (
                <div key={appt.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600 flex-shrink-0">
                        {appt.staff?.full_name
                          ? appt.staff.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)
                          : '?'}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {appt.staff?.full_name ? `Dr. ${appt.staff.full_name}` : 'Unknown Dentist'}
                        </p>
                        <p className="text-xs text-slate-500">{appt.staff?.specialty || 'General Dentist'}</p>
                      </div>
                    </div>
                    <span className={cn(
                      'text-[10px] font-bold px-2.5 py-1 rounded-full capitalize',
                      STATUS_STYLES[appt.status] || 'bg-slate-100 text-slate-600',
                    )}>
                      {appt.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-500 border-t border-slate-100 pt-3">
                    <span className="flex items-center gap-1.5">
                      <Calendar size={12} />
                      {fmtApptDate(appt.scheduled_at)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock size={12} />
                      {fmtApptTime(appt.scheduled_at)}
                    </span>
                  </div>

                  {appt.procedure_type && (
                    <p className="text-xs text-blue-700 font-medium bg-blue-50 rounded-lg px-2.5 py-1.5 mt-2">
                      {appt.procedure_type}
                    </p>
                  )}
                  {appt.chief_complaint && (
                    <p className="text-xs text-slate-500 mt-1.5 italic line-clamp-2">
                      "{appt.chief_complaint}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
