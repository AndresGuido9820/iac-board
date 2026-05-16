import React, { useCallback, useRef, useState } from 'react'

export type LoadedFile = { path: string; content: string }

type ImportZoneProps = {
  onFilesLoaded: (files: LoadedFile[]) => void
  loadedFiles: LoadedFile[]
}

const ACCEPTED = ['.tf', '.tfvars']

function isAcceptedFile(file: File): boolean {
  return ACCEPTED.some((ext) => file.name.endsWith(ext))
}

async function readFile(file: File): Promise<LoadedFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve({ path: file.name, content: reader.result as string })
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`))
    reader.readAsText(file)
  })
}

export function ImportZone({ onFilesLoaded, loadedFiles }: ImportZoneProps) {
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const processFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return
      setError(null)

      const accepted = Array.from(fileList).filter(isAcceptedFile)
      if (accepted.length === 0) {
        setError('No .tf or .tfvars files found. Drop Terraform files only.')
        return
      }

      try {
        const loaded = await Promise.all(accepted.map(readFile))
        onFilesLoaded(loaded)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to read files')
      }
    },
    [onFilesLoaded],
  )

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(true)
  }, [])

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(false)
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragging(false)
      processFiles(e.dataTransfer.files)
    },
    [processFiles],
  )

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      processFiles(e.target.files)
    },
    [processFiles],
  )

  return (
    <div className="import-zone-wrapper">
      {/* Drop zone */}
      <div
        aria-label="Drop Terraform files here"
        className={`import-drop-zone${dragging ? ' import-drop-zone--active' : ''}`}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
        role="region"
      >
        <div className="import-drop-icon">
          <svg fill="none" height={40} stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" width={40}>
            <path d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="import-drop-label">
          Drop <strong>.tf</strong> or <strong>.tfvars</strong> files here
        </p>
        <p className="import-drop-hint">Entire Terraform module — multiple files supported</p>
        <button
          className="import-pick-btn"
          onClick={() => inputRef.current?.click()}
          type="button"
        >
          Browse files
        </button>
        <input
          accept=".tf,.tfvars"
          multiple
          onChange={onInputChange}
          ref={inputRef}
          style={{ display: 'none' }}
          type="file"
        />
      </div>

      {/* Error */}
      {error && <p className="import-error" role="alert">{error}</p>}

      {/* Loaded files list */}
      {loadedFiles.length > 0 && (
        <ul className="import-file-list" aria-label="Loaded files">
          {loadedFiles.map((f) => (
            <li key={f.path}>
              <span className="import-file-name">{f.path}</span>
              <span className="import-file-size">{f.content.split('\n').length} lines</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
