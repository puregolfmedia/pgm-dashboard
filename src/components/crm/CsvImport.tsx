'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function CsvImport() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  const handleFile = (f: File) => {
    if (!f.name.endsWith('.csv')) { setError('Please select a .csv file'); return }
    setFile(f)
    setError(null)
    setResult(null)
  }

  const upload = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    const formData = new FormData()
    formData.append('file', file)

    const res = await fetch('/api/crm/import', { method: 'POST', body: formData })
    const json = await res.json()

    setLoading(false)
    if (json.error) { setError(json.error); return }
    setResult(json.data)
  }

  return (
    <div className="space-y-5">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          const f = e.dataTransfer.files[0]
          if (f) handleFile(f)
        }}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
          dragging ? 'border-pgm-green bg-pgm-green/5' : 'border-gray-200 hover:border-pgm-green/40'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />
        <div className="text-4xl mb-3">📋</div>
        {file ? (
          <p className="text-sm font-medium text-pgm-ink">{file.name}</p>
        ) : (
          <>
            <p className="text-sm font-medium text-gray-700">Drop your LinkedIn Connections.csv here</p>
            <p className="text-xs text-gray-400 mt-1">or click to browse</p>
          </>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
      )}

      {result && (
        <div className="bg-pgm-green/10 border border-pgm-green/20 text-pgm-green text-sm rounded-lg px-4 py-3 space-y-0.5">
          <p className="font-semibold">Import complete</p>
          <p>{result.imported} contacts imported · {result.skipped} rows skipped</p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={upload}
          disabled={!file || loading}
          className="px-5 py-2.5 bg-pgm-green hover:bg-pgm-green/90 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Importing…' : 'Import contacts'}
        </button>
        {result && (
          <button
            onClick={() => router.push('/crm')}
            className="px-5 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-pgm-ink text-sm font-medium rounded-lg transition-colors"
          >
            View contacts
          </button>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-gray-50 rounded-xl p-5 space-y-2">
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">How to export from LinkedIn</p>
        <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
          <li>Go to LinkedIn → Me → Settings &amp; Privacy</li>
          <li>Click <strong>Data Privacy</strong> → <strong>Get a copy of your data</strong></li>
          <li>Select <strong>Connections</strong> and request the archive</li>
          <li>LinkedIn emails you a download link (usually within minutes)</li>
          <li>Download and upload <strong>Connections.csv</strong> here</li>
        </ol>
      </div>
    </div>
  )
}
