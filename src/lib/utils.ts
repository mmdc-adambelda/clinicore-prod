import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }
export const formatPHP = (n: number) => '₱' + n.toLocaleString('en-PH')
export const formatDate = (d: string) => new Date(d).toLocaleDateString('en-PH', { year:'numeric', month:'short', day:'numeric' })
export const formatDateTime = (d: string) => new Date(d).toLocaleString('en-PH', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })
