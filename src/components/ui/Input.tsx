'use client'

import { InputHTMLAttributes, useId } from 'react'
import PasswordInput from './PasswordInput'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: string
  error?: string
}

export default function Input({ label, hint, error, className = '', id, type, ...props }: InputProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const hintId = hint ? `${inputId}-hint` : undefined
  return (
    <div>
      <label htmlFor={inputId} className="block text-sm font-medium text-pgm-ink mb-1.5">{label}</label>
      {hint && <p id={hintId} className="text-xs text-gray-400 mb-1.5">{hint}</p>}
      {(() => {
        const Field = type === 'password' ? PasswordInput : 'input'
        return (
          <Field
            {...(type === 'password' ? {} : { type })}
            id={inputId}
            aria-describedby={hintId}
            className={`w-full px-3.5 py-2.5 rounded-lg border text-sm text-pgm-ink placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pgm-green/40 focus:border-pgm-green transition ${
              error ? 'border-red-300' : 'border-gray-200'
            } ${className}`}
            {...props}
          />
        )
      })()}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}
