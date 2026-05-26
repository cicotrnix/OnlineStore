import { cn } from '@/lib/utils/cn'
import type { InputHTMLAttributes } from 'react'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
}
