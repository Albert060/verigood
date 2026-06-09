import { Button } from './index';

// Estado vacío genérico. Sin datos demo. Reusable en homes de módulo,
// listados sin resultados, etc.
export default function EmptyState({
  glyph = '§',
  title,
  description,
  cta,           // { label, onClick } | undefined
  secondaryCta,  // { label, onClick } | undefined
  className = '',
}) {
  return (
    <div
      className={`bg-card-bg border border-linea card-fold p-8 text-center ${className}`}
    >
      <div className="font-display italic text-[42px] text-marron-soft opacity-50 mb-3 leading-none">
        {glyph}
      </div>
      {title && (
        <h3 className="font-display text-[18px] font-bold text-tinta mb-2">
          {title}
        </h3>
      )}
      {description && (
        <p className="text-[13px] text-marron-soft max-w-md mx-auto mb-5">
          {description}
        </p>
      )}
      {(cta || secondaryCta) && (
        <div className="flex items-center justify-center gap-2">
          {cta && (
            <Button onClick={cta.onClick}>{cta.label}</Button>
          )}
          {secondaryCta && (
            <button
              onClick={secondaryCta.onClick}
              className="btn-ghost"
            >
              {secondaryCta.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
