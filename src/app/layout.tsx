import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'CliniCore EMR', template: '%s | CliniCore EMR' },
  description: 'Dental & Veterinary Electronic Medical Records System',
  robots: 'noindex, nofollow',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 antialiased font-sans">
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 3000,
            style: { fontSize: '13px', fontWeight: '500' },
            success: { style: { background: '#10B981', color: 'white' } },
            error:   { style: { background: '#EF4444', color: 'white' } },
          }}
        />
      </body>
    </html>
  )
}
