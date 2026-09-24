import { useState } from 'react'
import { fileToCompressedDataUrl } from '../lib/image.js'

export default function PhotoInput({ value, onChange, label = 'Photo' }) {
  const [error, setError] = useState('')

  const handleFile = async (e) => {
    const file = e.target.files && e.target.files[0]
    setError('')
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.')
      return
    }
    try {
      onChange(await fileToCompressedDataUrl(file))
    } catch {
      setError('Could not read that image. Try another file.')
    }
  }

  return (
    <div className="photo-input">
      <span className="form-label">{label}</span>
      <div className="photo-row">
        {value ? (
          <img className="photo-preview" src={value} alt="Officer" />
        ) : (
          <div className="photo-placeholder" aria-hidden="true" />
        )}
        <div className="photo-controls">
          <input type="file" accept="image/*" onChange={handleFile} />
          {value && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange('')}>
              Remove
            </button>
          )}
          {error && <p className="form-error">{error}</p>}
        </div>
      </div>
    </div>
  )
}
