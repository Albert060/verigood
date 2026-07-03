import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { superadminApi, pdfApi } from '../../services/api';
import { PageHeader, StatCard, SectionLabel, Badge } from '../../components/ui';

const PLAN_LABEL = { starter: 'Starter', colegio: 'Colegio', enterprise: 'Enterprise' };
const MONTH_LABELS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function bucketLabel(bucket) {
  if (!bucket) return '';
  if (bucket.length === 4) return bucket;
  const [y, m] = bucket.split('-');
  return `${MONTH_LABELS_ES[Number(m) - 1]} ${y.slice(2)}`;
}

function formatEUR(value) {
  const n = Number(value) || 0;
  return `${n.toLocaleString('es-ES')} €`;
}

export default function SuperadminBilling() {
  const [period, setPeriod] = useState('monthly');
  const [downloading, setDownloading] = useState(null);
  // scope: 'global' = todos los centros; o un orgId concreto para vista por colegio.
  const [scope, setScope] = useState('global');

  // Datos globales — siempre se cargan; alimentan el selector de colegio.
  const { data: globalData, isLoading: loadingGlobal } = useQuery({
    queryKey: ['superadmin-billing'],
    queryFn: () => superadminApi.getBilling().then((r) => r.data),
    staleTime: 60_000,
    refetchInterval: 120_000,
    refetchOnWindowFocus: true,
  });

  // Datos por organización — solo si el superadmin elige un colegio concreto.
  const { data: orgData, isLoading: loadingOrg } = useQuery({
    queryKey: ['superadmin-billing-org', scope],
    queryFn: () => superadminApi.getOrgBilling(scope).then((r) => r.data),
    enabled: scope !== 'global',
    staleTime: 60_000,
  });

  const isGlobal = scope === 'global';
  const data = isGlobal ? globalData : orgData;
  const isLoading = isGlobal ? loadingGlobal : loadingOrg;

  // Catálogo de orgs para el selector (deriva de los datos globales).
  const orgsCatalog = useMemo(() => {
    const seen = new Map();
    (globalData?.invoices || []).forEach((inv) => {
      if (!seen.has(inv.org_id)) {
        seen.set(inv.org_id, { id: inv.org_id, name: inv.org_name, plan: inv.plan });
      }
    });
    return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [globalData]);

  // Descarga informe global del periodo elegido. Reusa /api/pdf/render con
  // type='global_billing'. Para 'monthly' acota las facturas al mes en curso
  // (date_trunc('month', NOW())); para 'yearly' a las del año en curso. La
  // serie se mantiene completa (12 meses / 3 años) para dar contexto.
  const handleDownload = async (kind) => {
    if (!data || downloading) return;
    setDownloading(kind);
    try {
      const now = new Date();
      const periodLabel = kind === 'monthly'
        ? now.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
        : String(now.getFullYear());

      const series = kind === 'monthly'
        ? (data.monthlySeries || []).map((s) => ({
            bucket: s.bucket, value: s.mrr_eur, active_orgs: s.active_orgs,
          }))
        : (data.yearlySeries || []).map((s) => ({
            bucket: s.bucket, value: s.arr_eur, active_orgs: s.active_orgs,
          }));

      // Acotar facturas al periodo.
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfYear  = new Date(now.getFullYear(), 0, 1);
      const cutoff = kind === 'monthly' ? startOfMonth : startOfYear;
      const invoices = (data.invoices || []).filter((inv) => new Date(inv.issued_at) >= cutoff);

      const orgName = isGlobal ? null : data?.org?.name;
      const slug = (s) => String(s || 'verigood').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40);
      const title = isGlobal
        ? (kind === 'monthly' ? 'Facturación global · Mensual' : 'Facturación global · Anual')
        : (kind === 'monthly' ? `Facturación · ${orgName} · Mensual` : `Facturación · ${orgName} · Anual`);

      await pdfApi.download({
        type: 'global_billing',
        data: {
          period: kind,
          periodLabel: orgName ? `${orgName} — ${periodLabel}` : periodLabel,
          generatedAt: now.toISOString(),
          mrr_eur: data.mrr_eur,
          arr_eur: data.arr_eur,
          active_orgs: data.active_orgs,
          total_orgs: data.total_orgs,
          planBreakdown: data.planBreakdown,
          planPrices: data.planPrices,
          series,
          invoices,
        },
        title,
        subtitle: orgName ? `${orgName} — ${periodLabel}` : periodLabel,
        filename: `verigood_facturacion_${isGlobal ? 'global' : slug(orgName)}_${kind === 'monthly' ? 'mensual' : 'anual'}_${now.getFullYear()}${kind === 'monthly' ? `-${String(now.getMonth() + 1).padStart(2, '0')}` : ''}`,
      });
    } catch (err) {
      console.error('PDF download failed', err);
    } finally {
      setDownloading(null);
    }
  };

  const series = period === 'monthly'
    ? (data?.monthlySeries || [])
    : (data?.yearlySeries || []);
  const valueKey = period === 'monthly' ? 'mrr_eur' : 'arr_eur';
  const max = Math.max(...series.map((s) => Number(s[valueKey]) || 0), 1);

  const invoices = data?.invoices || [];
  const planBreakdown = data?.planBreakdown || [];

  // Delta MRR mes actual vs mes anterior.
  const delta = useMemo(() => {
    const m = data?.monthlySeries || [];
    if (m.length < 2) return null;
    const cur  = Number(m[m.length - 1].mrr_eur) || 0;
    const prev = Number(m[m.length - 2].mrr_eur) || 0;
    if (!prev) return null;
    const pct = Math.round(((cur - prev) / prev) * 1000) / 10;
    return { pct, up: cur >= prev };
  }, [data]);

  return (
    <div className="animate-slide-in">
      <PageHeader
        title={isGlobal ? 'Facturación global' : `Facturación · ${data?.org?.name || ''}`}
        subtitle={isGlobal ? 'INGRESOS · MRR / ARR · TODOS LOS COLEGIOS' : 'INGRESOS DEL CENTRO · MRR / ARR'}
        romanNum="§ III"
      />

      {/* Selector de ámbito: global vs colegio concreto */}
      <div className="bg-card-bg border border-linea shadow-card p-3 mb-5 flex items-center gap-3 flex-wrap">
        <SectionLabel className="mb-0">ÁMBITO</SectionLabel>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setScope('global')}
            className={`font-mono text-[10px] px-2 py-1 border transition-colors ${
              isGlobal
                ? 'border-marino bg-marino text-papel'
                : 'border-linea text-marron-soft hover:text-tinta'
            }`}
          >
            GLOBAL
          </button>
          <button
            onClick={() => {
              if (orgsCatalog[0]) setScope(orgsCatalog[0].id);
            }}
            disabled={orgsCatalog.length === 0}
            className={`font-mono text-[10px] px-2 py-1 border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              !isGlobal
                ? 'border-marino bg-marino text-papel'
                : 'border-linea text-marron-soft hover:text-tinta'
            }`}
          >
            POR COLEGIO
          </button>
        </div>
        {!isGlobal && (
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            className="px-3 py-1.5 bg-papel border border-linea font-mono text-[12px] text-tinta focus:outline-none focus:border-marino"
          >
            {orgsCatalog.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name} ({(o.plan || 'starter').toUpperCase()})
              </option>
            ))}
          </select>
        )}
        <span className="font-mono text-[10px] text-marron-soft ml-auto">
          {isGlobal
            ? `${globalData?.active_orgs ?? 0} de ${globalData?.total_orgs ?? 0} centros activos`
            : data?.org?.is_active === false
              ? 'CENTRO SUSPENDIDO'
              : data?.org?.plan
                ? `Plan ${(data.org.plan || '').toUpperCase()}`
                : ''}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard
          label="MRR ACTUAL"
          value={isLoading ? '—' : formatEUR(data?.mrr_eur)}
          delta={delta ? `${delta.pct > 0 ? '+' : ''}${delta.pct}% vs mes ant.` : null}
          deltaUp={delta?.up}
          mono={false}
        />
        <StatCard
          label="ARR ESTIMADO"
          value={isLoading ? '—' : formatEUR(data?.arr_eur)}
          mono={false}
        />
        {isGlobal ? (
          <StatCard
            label="ORGS ACTIVAS"
            value={isLoading ? '—' : `${data?.active_orgs ?? 0} / ${data?.total_orgs ?? 0}`}
          />
        ) : (
          <StatCard
            label="USO / MES"
            value={isLoading ? '—' : (data?.usage?.monthly_calls ?? 0).toLocaleString('es-ES')}
            delta={data?.usage?.active_teachers_month != null ? `${data.usage.active_teachers_month} profes activos` : null}
          />
        )}
        {isGlobal ? (
          <StatCard
            label="FACTURAS"
            value={isLoading ? '—' : invoices.length}
          />
        ) : (
          <StatCard
            label="COBRADO / PENDIENTE"
            value={isLoading ? '—' : formatEUR(data?.totals?.paid_eur)}
            delta={data?.totals?.pending_eur ? `${formatEUR(data.totals.pending_eur)} pendiente` : 'todo al día'}
            mono={false}
          />
        )}
      </div>

      {/* Serie temporal */}
      <div className="bg-card-bg border border-linea shadow-card card-fold p-5 mb-5">
        <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
          <SectionLabel className="mb-0">
            {period === 'monthly' ? 'EVOLUCIÓN MRR — ÚLTIMOS 12 MESES' : 'EVOLUCIÓN ARR — ÚLTIMOS 3 AÑOS'}
          </SectionLabel>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              {[
                { key: 'monthly', label: 'MES' },
                { key: 'yearly',  label: 'AÑO' },
              ].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setPeriod(opt.key)}
                  className={`font-mono text-[10px] px-2 py-1 border transition-colors ${
                    period === opt.key
                      ? 'border-marino bg-marino text-papel'
                      : 'border-linea text-marron-soft hover:text-tinta'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 border-l border-linea pl-3">
              <button
                onClick={() => handleDownload('monthly')}
                disabled={!data || downloading === 'monthly'}
                className="font-mono text-[10px] px-2 py-1 border border-marino text-marino hover:bg-marino hover:text-papel disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Descargar informe del mes en curso"
              >
                {downloading === 'monthly' ? 'GENERANDO…' : 'PDF MENSUAL'}
              </button>
              <button
                onClick={() => handleDownload('yearly')}
                disabled={!data || downloading === 'yearly'}
                className="font-mono text-[10px] px-2 py-1 border border-marino text-marino hover:bg-marino hover:text-papel disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Descargar informe del año en curso"
              >
                {downloading === 'yearly' ? 'GENERANDO…' : 'PDF ANUAL'}
              </button>
            </div>
          </div>
        </div>

        {series.length === 0 ? (
          <p className="font-mono text-[11px] text-marron-soft">Sin datos.</p>
        ) : (
          <div className="flex items-end gap-3 h-28">
            {series.map((m) => {
              const v = Number(m[valueKey]) || 0;
              return (
                <div key={m.bucket} className="flex flex-col items-center gap-1 flex-1 min-w-0">
                  <span className="font-mono text-[9px] text-tinta">
                    {v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}
                  </span>
                  <div
                    className="w-full bg-marino opacity-70 min-h-[2px] transition-all duration-500"
                    style={{ height: `${(v / max) * 80}px` }}
                    title={`${bucketLabel(m.bucket)}: ${formatEUR(v)}`}
                  />
                  <span className="font-mono text-[9px] text-marron-soft truncate w-full text-center">
                    {bucketLabel(m.bucket)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Plan breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
        {planBreakdown.length === 0 && (
          <div className="col-span-3 bg-card-bg border border-linea shadow-card p-4">
            <p className="font-mono text-[11px] text-marron-soft">Sin organizaciones activas.</p>
          </div>
        )}
        {planBreakdown.map(({ plan, count }) => {
          const price = (data?.planPrices || {})[plan] || 0;
          return (
            <div key={plan} className="bg-card-bg border border-linea shadow-card p-4">
              <SectionLabel className="mb-2">PLAN {(PLAN_LABEL[plan] || plan).toUpperCase()}</SectionLabel>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-3xl text-tinta">{count}</span>
                <span className="font-mono text-[11px] text-marron-soft">orgs</span>
              </div>
              <div className="font-mono text-[11px] text-marron-soft mt-1">
                {price ? `${formatEUR(price * count)} / mes` : 'precio a medida'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Facturas globales */}
      <div className="bg-card-bg border border-linea shadow-card">
        <div className="px-4 py-3 border-b border-linea">
          <SectionLabel className="mb-0">ÚLTIMAS TRANSACCIONES — GLOBAL</SectionLabel>
        </div>

        {isLoading && (
          <div className="h-24 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-marino border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!isLoading && invoices.length === 0 && (
          <div className="px-4 py-6 text-center font-mono text-[11px] text-marron-soft">
            Aún no hay facturas registradas.
          </div>
        )}

        {!isLoading && invoices.length > 0 && (
          <div className="overflow-x-auto">
            <table className="vg-table">
              <thead>
                <tr>
                  <th>FECHA</th><th>ORGANIZACIÓN</th><th>PLAN</th>
                  <th>IMPORTE</th><th>ORIGEN</th><th>ESTADO</th>
                </tr>
              </thead>
              <tbody>
                {invoices.slice(0, 30).map((inv) => (
                  <tr key={inv.id}>
                    <td className="font-mono text-[11px] text-marron-soft">
                      {new Date(inv.issued_at).toLocaleDateString('es')}
                    </td>
                    <td className="text-tinta font-medium">{inv.org_name}</td>
                    <td>
                      <Badge variant={`plan-${inv.plan || 'starter'}`}>
                        {(inv.plan || 'starter').toUpperCase()}
                      </Badge>
                    </td>
                    <td className="font-mono text-[13px] text-tinta">{formatEUR(inv.amount_eur)}</td>
                    <td className="font-mono text-[10px] text-marron-soft uppercase">{inv.source}</td>
                    <td>
                      <span className={`font-mono text-[10px] px-2 py-0.5 border ${
                        inv.status === 'paid'
                          ? 'bg-[#EBF5EF] text-[#1A5C35] border-[#7DC49B]'
                          : 'bg-[#FCF7E6] text-tinta border-amarillo'
                      }`}>
                        {inv.status === 'paid' ? 'PAGADO' : 'PENDIENTE'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
