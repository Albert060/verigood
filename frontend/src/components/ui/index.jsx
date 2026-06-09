// ── Button ───────────────────────────────────────────────────
export function Button({ children, variant = 'primary', size = 'md', disabled, loading, onClick, type = 'button', className = '' }) {
  const base = 'inline-flex items-center justify-center gap-2 font-sans transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary: 'btn-primary',
    ghost: 'btn-ghost',
    danger: 'btn-danger',
  };
  const sizes = {
    sm: 'text-[13px] px-4 py-2 rounded-lg',
    md: '',
    lg: 'text-[17px] px-7 py-3.5 rounded-xl',
  };
  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {loading && (
        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
}

// ── Card ─────────────────────────────────────────────────────
export function Card({ children, className = '', fold = true }) {
  return (
    <div className={`bg-card-bg border border-linea shadow-card rounded-2xl ${fold ? 'card-fold' : ''} ${className}`}>
      {children}
    </div>
  );
}

// ── Input ─────────────────────────────────────────────────────
export function Input({ label, error, className = '', ...props }) {
  return (
    <div className={className}>
      {label && <label className="section-label mb-2 block">{label}</label>}
      <input className="vg-input" {...props} />
      {error && <p className="text-granate text-[13px] mt-1.5 font-mono">{error}</p>}
    </div>
  );
}

export function Select({ label, error, children, className = '', ...props }) {
  return (
    <div className={className}>
      {label && <label className="section-label mb-2 block">{label}</label>}
      <select className="vg-select" {...props}>{children}</select>
      {error && <p className="text-granate text-[13px] mt-1.5 font-mono">{error}</p>}
    </div>
  );
}

export function Textarea({ label, error, className = '', ...props }) {
  return (
    <div className={className}>
      {label && <label className="section-label mb-2 block">{label}</label>}
      <textarea className="vg-textarea" {...props} />
      {error && <p className="text-granate text-[13px] mt-1.5 font-mono">{error}</p>}
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────────────
export function Badge({ children, variant = 'active', className = '' }) {
  return (
    <span className={`badge badge-${variant} ${className}`}>{children}</span>
  );
}

// ── Toggle ────────────────────────────────────────────────────
export function Toggle({ on, onChange, disabled = false }) {
  return (
    <div
      className={`toggle-track ${on ? 'on' : ''} ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
      onClick={() => !disabled && onChange(!on)}
    >
      <div className="toggle-thumb" />
    </div>
  );
}

// ── Modal ────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, footer }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-tinta/50" onClick={onClose} />
      <div className="relative bg-papel border border-linea shadow-card-hover w-full max-w-xl animate-slide-in rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-linea">
          <h3 className="font-display text-[20px] font-bold text-tinta">{title}</h3>
          <button onClick={onClose} className="text-marron-soft hover:text-tinta text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-full hover:bg-papel-hover transition-colors">&times;</button>
        </div>
        <div className="p-6">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-linea flex justify-end gap-3 bg-card-bg">{footer}</div>}
      </div>
    </div>
  );
}

// ── Tag Selector ──────────────────────────────────────────────
export function TagCloud({ options, selected, onChange, multi = true }) {
  const toggle = (val) => {
    if (!multi) return onChange([val]);
    onChange(selected.includes(val) ? selected.filter((v) => v !== val) : [...selected, val]);
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          className={`vg-tag ${selected.includes(value) ? 'selected' : ''}`}
          onClick={() => toggle(value)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ── Progress bar ──────────────────────────────────────────────
export function ProgressBar({ value, max, variant = 'marino', className = '' }) {
  const pct = Math.min(100, (value / max) * 100);
  const colors = { marino: 'bg-marino', granate: 'bg-granate', verde: 'bg-[#2D6A4F]' };
  return (
    <div className={`progress-bar ${className}`}>
      <div className={`progress-fill ${colors[variant]}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ── Spinner ───────────────────────────────────────────────────
export function Spinner({ size = 'md' }) {
  const s = { sm: 'w-5 h-5', md: 'w-7 h-7', lg: 'w-10 h-10' }[size];
  return (
    <svg className={`animate-spin ${s} text-marino`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ── Empty state ───────────────────────────────────────────────
export function EmptyState({ title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="font-display text-[20px] font-bold text-tinta mb-2">{title}</div>
      {description && <p className="text-marron-soft text-[15px] mb-5 max-w-md leading-relaxed">{description}</p>}
      {action}
    </div>
  );
}

// ── Section Label ─────────────────────────────────────────────
export function SectionLabel({ children, className = '' }) {
  return <div className={`section-label ${className}`}>{children}</div>;
}

// ── Stats Card ────────────────────────────────────────────────
export function StatCard({ label, value, delta, deltaUp, mono = true }) {
  return (
    <div className="bg-card-bg border border-linea p-6 shadow-card rounded-2xl transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5">
      <div className="section-label mb-3">{label}</div>
      <div className={`text-[36px] leading-none text-tinta mb-2 ${mono ? 'font-mono' : 'font-display font-bold'}`}>
        {value}
      </div>
      {delta && (
        <div className={`text-[13px] font-mono font-medium ${deltaUp ? 'text-[#2D6A4F]' : 'text-granate'}`}>
          {deltaUp ? '↑' : '↓'} {delta}
        </div>
      )}
    </div>
  );
}

// ── Page Header ───────────────────────────────────────────────
export function PageHeader({ title, subtitle, actions, romanNum }) {
  return (
    <div className="flex items-start justify-between mb-8 gap-6">
      <div className="flex items-start gap-4">
        {romanNum && (
          <span className="marginalia mt-2 hidden md:block">{romanNum}</span>
        )}
        <div>
          <h1 className="font-display text-[32px] font-bold text-tinta leading-tight mb-1">
            {title}
          </h1>
          {subtitle && (
            <p className="font-mono text-[14px] text-marron-soft tracking-[0.03em]">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-3 flex-shrink-0">{actions}</div>}
    </div>
  );
}
