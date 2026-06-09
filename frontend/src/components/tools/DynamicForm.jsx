// Form genérico generado desde tool.input_schema.
// Soporta los tipos del seed: text, textarea, select, number.
// schema: { fields: [{ key, label, type, required, options, min, max, default, placeholder }] }

export default function DynamicForm({ schema, value, onChange, disabled = false, errors = {} }) {
  const fields = (schema && schema.fields) || [];

  const setField = (key, v) => onChange({ ...value, [key]: v });

  return (
    <div className="space-y-5">
      {fields.map((f) => {
        const v = value[f.key] ?? f.default ?? '';
        const err = errors[f.key];

        return (
          <div key={f.key}>
            <label className="block font-mono text-[11px] tracking-[0.1em] uppercase text-marron-soft mb-1.5">
              {f.label}
              {f.required && <span className="text-granate ml-1">*</span>}
            </label>

            {f.type === 'textarea' && (
              <textarea
                className="vg-textarea w-full"
                rows={5}
                value={v}
                placeholder={f.placeholder || ''}
                disabled={disabled}
                onChange={(e) => setField(f.key, e.target.value)}
              />
            )}

            {f.type === 'select' && (
              <select
                className="vg-select w-full"
                value={v}
                disabled={disabled}
                onChange={(e) => setField(f.key, e.target.value)}
              >
                <option value="">— Selecciona —</option>
                {(f.options || []).map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            )}

            {f.type === 'number' && (
              <input
                type="number"
                className="vg-input w-full"
                value={v}
                min={f.min}
                max={f.max}
                disabled={disabled}
                onChange={(e) => setField(f.key, e.target.value === '' ? '' : Number(e.target.value))}
              />
            )}

            {(!f.type || f.type === 'text') && (
              <input
                type="text"
                className="vg-input w-full"
                value={v}
                placeholder={f.placeholder || ''}
                disabled={disabled}
                onChange={(e) => setField(f.key, e.target.value)}
              />
            )}

            {err && (
              <p className="mt-1 font-mono text-[11px] text-granate">{err}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
