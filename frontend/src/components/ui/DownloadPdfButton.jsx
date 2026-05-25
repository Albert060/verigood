import { useState } from 'react';
import { pdfApi } from '../../services/api';
import { Button } from './index';

/**
 * Generic "Download PDF" button. Pass the structured result from any
 * generator endpoint plus the layout type and a friendly filename.
 */
export default function DownloadPdfButton({
  type,
  data,
  title,
  subtitle,
  moduleKey,
  filename,
  variant = 'primary',
  size = 'md',
  label = 'Descargar PDF',
  className = '',
  disabled = false,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onClick = async () => {
    setError('');
    setLoading(true);
    try {
      await pdfApi.download({ type, data, title, subtitle, moduleKey, filename });
    } catch (e) {
      console.error('pdf download error', e);
      setError('No se pudo generar el PDF');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`inline-flex flex-col items-start gap-1 ${className}`}>
      <Button
        variant={variant}
        size={size}
        loading={loading}
        disabled={disabled || !data}
        onClick={onClick}
      >
        ↓  {label}
      </Button>
      {error && <span className="font-mono text-[12px] text-granate">{error}</span>}
    </div>
  );
}
