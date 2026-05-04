import { Metadata } from 'next'
import AppointmentsView from '@/components/appointments/AppointmentsView'
export const metadata: Metadata = { title: 'Appointments' }

// Pass today's local date as a starting point — actual data fetching happens client-side
export default function AppointmentsPage({ searchParams }: { searchParams: { date?: string } }) {
  const date = searchParams.date || ''
  return <AppointmentsView initialDate={date} />
}
