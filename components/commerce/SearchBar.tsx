'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface Props {
  initialQuery?: string
  placeholder?: string
  size?: 'sm' | 'lg'
}

export function SearchBar({
  initialQuery = '',
  placeholder = 'Buscar productos...',
  size = 'sm',
}: Props) {
  const [q, setQ] = useState(initialQuery)
  const router = useRouter()

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = q.trim()
    if (!trimmed) return
    router.push(`/search?q=${encodeURIComponent(trimmed)}`)
  }

  const inputClass =
    size === 'lg'
      ? 'w-full px-4 py-3 text-base rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900'
      : 'w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-gray-700'

  return (
    <form
      onSubmit={onSubmit}
      aria-label="Buscador de productos"
      className={size === 'lg' ? 'flex w-full max-w-xl gap-2' : 'flex items-center gap-2 w-56'}
    >
      <label htmlFor={`search-input-${size}`} className="sr-only">
        Buscar productos
      </label>
      <input
        id={`search-input-${size}`}
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        className={inputClass}
        aria-label="Buscar productos"
      />
      <button
        type="submit"
        className={
          size === 'lg'
            ? 'px-5 py-3 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800'
            : 'px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-medium hover:bg-gray-800'
        }
      >
        Buscar
      </button>
    </form>
  )
}
