'use client'

import { useState } from 'react'

type Props = {
  name: string
  defaultValue?: number
  min?: number
  decrementLabel: string
  incrementLabel: string
  /** Si se pasa, se llama con el nuevo valor en cada cambio (edición inline). */
  onChange?: (value: number) => void
}

/**
 * Selector de cantidad `− [n] +`. Default 1, mínimo 1 (no se agrega 0). El input
 * lleva `name` para enviarse en el form de Add. Operable por teclado, con
 * aria-label en − y + (WCAG). Lo usan card (Vista A) y fila densa (Vista B).
 */
export function QuantityStepper({
  name,
  defaultValue = 1,
  min = 1,
  decrementLabel,
  incrementLabel,
  onChange,
}: Props) {
  const [qty, setQty] = useState(defaultValue)
  const set = (v: number) => {
    const n = Math.max(min, Number.isFinite(v) ? v : min)
    setQty(n)
    onChange?.(n)
  }

  return (
    <div className="inline-flex items-center rounded-lg border border-gray-200 bg-white">
      <button
        type="button"
        aria-label={decrementLabel}
        onClick={() => set(qty - 1)}
        className="px-2.5 py-1.5 text-gray-600 transition-transform hover:text-gray-900 active:scale-90 disabled:text-gray-300 motion-reduce:transition-none motion-reduce:active:scale-100"
        disabled={qty <= min}
      >
        −
      </button>
      <input
        name={name}
        type="number"
        min={min}
        value={qty}
        onChange={(e) => set(Number(e.target.value) || min)}
        aria-label={name}
        className="w-10 border-x border-gray-200 bg-transparent py-1.5 text-center text-sm tabular-nums focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button
        type="button"
        aria-label={incrementLabel}
        onClick={() => set(qty + 1)}
        className="px-2.5 py-1.5 text-gray-600 transition-transform hover:text-gray-900 active:scale-90 motion-reduce:transition-none motion-reduce:active:scale-100"
      >
        +
      </button>
    </div>
  )
}
