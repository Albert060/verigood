import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { superadminApi } from '../../services/api';
import { PageHeader, Badge, Button, Modal, Select, Toggle, SectionLabel } from '../../components/ui';

const MOCK_ORGS = [
  { id: '1', name: 'Colegio San Isidro', city: 'Madrid', plan: 'colegio', active_modules: ['cambridge','espanol','matematicas','medio'], active_users: 12, monthly_usage: 2840, is_active: true, created_at: '2024-09-01' },
  { id: '2', name: 'IES Cervantes', city: 'Barcelona', plan: 'starter', active_modules: ['cambridge'], active_users: 1, monthly_usage: 320, is_active: true, created_at: '2024-10-15' },
  { id: '3', name: 'Colegio Santa María', city: 'Valencia', plan: 'enterprise', active_modules: ['cambridge','espanol','matematicas','medio','oposiciones'], active_users: 38, monthly_usage: 9100, is_active: true, created_at: '2024-08-20' },
  { id: '4', name: 'CEIP Los Olivos', city: 'Sevilla', plan: 'colegio', active_modules: ['cambridge','matematicas'], active_users: 7, monthly_usage: 1240, is_active: true, created_at: '2025-01-10' },
  { id: '5', name: 'IES Lope de Vega', city: 'Málaga', plan: 'starter', active_modules: ['cambridge'], active_users: 1, monthly_usage: 80, is_active: false, created_at: '2025-03-05' },
  { id: '6', name: 'Colegio Bilingüe Norte', city: 'Bilbao', plan: 'colegio', active_modules: ['cambridge','espanol'], active_users: 9, monthly_usage: 1890, is_active: true, created_at: '2024-11-22' },
];

const MODULE_LABELS = { cambridge: 'Cambridge', espanol: 'Lengua', matematicas: 'Mates', medio: 'C.Medio', oposiciones: 'Oposic.' };

export default function SuperadminOrganizations() {
  const [search, setSearch] = useState('');
  const [editOrg, setEditOrg] = useState(null);
  const [editForm, setEditForm] = useState({});

  const orgs = MOCK_ORGS.filter((o) =>
    !search || o.name.toLowerCase().includes(search.toLowerCase()) || o.city.toLowerCase().includes(search.toLowerCase())
  );

  const openEdit = (org) => { setEditOrg(org); setEditForm({ plan: org.plan, is_active: org.is_active }); };

  return (
    <div className="animate-slide-in">
      <PageHeader
        title="Organizaciones"
        subtitle={`${MOCK_ORGS.length} CENTROS REGISTRADOS`}
        romanNum="§ II"
      />

      {/* Search */}
      <div className="flex items-center gap-3 mb-5">
        <input
          className="vg-input max-w-xs"
          placeholder="Buscar centro o ciudad..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className="font-mono text-[11px] text-marron-soft">{orgs.length} resultados</span>
      </div>

      {/* Table */}
      <div className="bg-card-bg border border-linea shadow-card">
        <div className="overflow-x-auto">
          <table className="vg-table">
            <thead>
              <tr>
                <th>CENTRO</th><th>CIUDAD</th><th>PLAN</th><th>MÓDULOS</th>
                <th>PROFESORES</th><th>USO/MES</th><th>ALTA</th><th>ESTADO</th><th></th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((org) => (
                <tr key={org.id}>
                  <td className="font-medium text-tinta">{org.name}</td>
                  <td className="font-mono text-[11px] text-marron-soft">{org.city}</td>
                  <td><Badge variant={`plan-${org.plan}`}>{org.plan.toUpperCase()}</Badge></td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {org.active_modules.map((m) => (
                        <span key={m} className="font-mono text-[9px] px-1.5 py-0.5 border border-linea text-marron-soft">
                          {MODULE_LABELS[m] || m}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="font-mono text-[12px]">{org.active_users}</td>
                  <td className="font-mono text-[11px]">{org.monthly_usage.toLocaleString()}</td>
                  <td className="font-mono text-[10px] text-marron-soft">
                    {new Date(org.created_at).toLocaleDateString('es')}
                  </td>
                  <td><Badge variant={org.is_active ? 'active' : 'paused'}>{org.is_active ? 'ACTIVO' : 'SUSP.'}</Badge></td>
                  <td>
                    <button
                      onClick={() => openEdit(org)}
                      className="font-mono text-[10px] text-marino hover:text-granate transition-colors"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit modal */}
      <Modal
        open={!!editOrg}
        onClose={() => setEditOrg(null)}
        title={editOrg?.name}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditOrg(null)}>Cancelar</Button>
            <Button onClick={() => setEditOrg(null)}>Guardar cambios</Button>
          </>
        }
      >
        {editOrg && (
          <div className="space-y-4">
            <Select
              label="PLAN"
              value={editForm.plan}
              onChange={(e) => setEditForm((f) => ({ ...f, plan: e.target.value }))}
            >
              <option value="starter">Starter — 29 €/mes</option>
              <option value="colegio">Colegio — 149 €/mes</option>
              <option value="enterprise">Enterprise — A medida</option>
            </Select>
            <div className="flex items-center justify-between py-2 border-t border-linea">
              <div>
                <p className="text-[13px] font-medium text-tinta">Organización activa</p>
                <p className="text-[11px] text-marron-soft">Desactivar suspende el acceso a todos los usuarios</p>
              </div>
              <Toggle
                on={editForm.is_active}
                onChange={(v) => setEditForm((f) => ({ ...f, is_active: v }))}
              />
            </div>
            <div className="bg-[rgba(232,216,154,0.15)] border border-amarillo p-3">
              <p className="font-mono text-[11px] text-[#7A5A1E]">
                Ciudad: {editOrg.city} · Alta: {new Date(editOrg.created_at).toLocaleDateString('es')} ·
                Profesores activos: {editOrg.active_users}
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
