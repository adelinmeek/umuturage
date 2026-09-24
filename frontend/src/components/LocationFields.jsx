import { PROVINCES, DISTRICTS, SECTORS, CELLS } from '../data/rwanda.js'

export default function LocationFields({ value, onChange, legend }) {
  const districts = value.province ? DISTRICTS[value.province] || [] : []
  const sectors = value.district ? SECTORS[value.district] || [] : []
  const cells =
    value.district && value.sector ? CELLS[`${value.district}/${value.sector}`] || [] : []

  const set = (field) => (e) => {
    const next = { ...value, [field]: e.target.value }
    if (field === 'province') Object.assign(next, { district: '', sector: '', cell: '', village: '' })
    if (field === 'district') Object.assign(next, { sector: '', cell: '', village: '' })
    if (field === 'sector') Object.assign(next, { cell: '', village: '' })
    if (field === 'cell') next.village = ''
    onChange(next)
  }

  return (
    <fieldset className="location-fields">
      <legend>{legend}</legend>
      <div className="form-row">
        <label className="form-field">
          <span>Province</span>
          <select value={value.province} onChange={set('province')} required>
            <option value="">Select province</option>
            {PROVINCES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>
        <label className="form-field">
          <span>District</span>
          <select value={value.district} onChange={set('district')} required disabled={!value.province}>
            <option value="">Select district</option>
            {districts.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="form-row">
        <label className="form-field">
          <span>Sector</span>
          <input
            list="umuturage-sector-suggestions"
            value={value.sector}
            onChange={set('sector')}
            placeholder="e.g. Remera"
            required
          />
          <datalist id="umuturage-sector-suggestions">
            {sectors.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </label>
        <label className="form-field">
          <span>Cell</span>
          <input
            list="umuturage-cell-suggestions"
            value={value.cell}
            onChange={set('cell')}
            placeholder="e.g. Rukiri I"
            required
          />
          <datalist id="umuturage-cell-suggestions">
            {cells.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </label>
      </div>
      <label className="form-field">
        <span>Village</span>
        <input value={value.village} onChange={set('village')} placeholder="e.g. Rukiri" required />
      </label>
    </fieldset>
  )
}
