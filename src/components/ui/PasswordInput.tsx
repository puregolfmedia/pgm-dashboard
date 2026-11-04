'use client'

import { InputHTMLAttributes, useState } from 'react'

/** A password box with a Show/Hide button, so people can check what they typed. */
export default function PasswordInput({ className = '', ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <input {...props} type={visible ? 'text' : 'password'} className={`${className} pr-16`}
        autoCapitalize="off" autoCorrect="off" spellCheck={false} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex items-center gap-1 px-3 text-xs font-medium text-gray-500 hover:text-pgm-green focus-visible:text-pgm-green rounded-r-lg"
      >
        <svg aria-hidden viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
          <circle cx="12" cy="12" r="2.8" />
          {visible && <path d="M4 4l16 16" />}
        </svg>
        {visible ? 'Hide' : 'Show'}
      </button>
    </div>
  )
}
