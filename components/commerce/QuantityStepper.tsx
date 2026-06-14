'use client'

import { useState } from 'react'

type Props = {
  name: string
  defaultValue?: number
  min?: number
  decrementLabel: string
  incrementLabel: string
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
}: Props) {
  const [qty, setQty] = useState(defaultValue)

  return (
    <div className="inline-flex items-center rounded-lg border border-gray-200 bg-white">
      <button
        type="button"
        aria-label={decrementLabel}
        onClick={() => setQty((q) => Math.max(min, q - 1))}
        className="px-2.5 py-1.5 text-gray-600 hover:text-gray-900 disabled:text-gray-300"
        disabled={qty <= min}
      >
        −
      </button>
      <input
        name={name}
        type="number"
        min={min}
        value={qty}
        onChange={(e) => setQty(Math.max(min, Number(e.target.value) || min))}
        aria-label={name}
        className="w-10 border-x border-gray-200 bg-transparent py-1.5 text-center text-sm tabular-nums focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button
        type="button"
        aria-label={incrementLabel}
        onClick={() => setQty((q) => q + 1)}
        className="px-2.5 py-1.5 text-gray-600 hover:text-gray-900"
      >
        +
      </button>
    </div>
  )
}
