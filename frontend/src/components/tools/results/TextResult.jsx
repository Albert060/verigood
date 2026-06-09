import { Card } from '../../ui';

// Render mínimo "para todo lo demás". Acepta:
//   - string  → lo pinta tal cual (preservando saltos de línea)
//   - objeto  → JSON con sangría (debug-friendly hasta que haya renderer)
export default function TextResult({ data }) {
  const isString = typeof data === 'string';

  return (
    <Card className="p-6">
      {isString ? (
        <div className="whitespace-pre-wrap text-tinta leading-relaxed font-display">
          {data}
        </div>
      ) : (
        <pre className="font-mono text-[12px] text-tinta whitespace-pre-wrap break-all">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </Card>
  );
}
