import React, { useState, useEffect } from 'react';
import { Edit3, Save } from 'lucide-react';
import Modal, { ModalButton } from '@/components/Modal';
import { getPrixConfig, updatePrixConfig, PrixConfig, getCommissionRate, updateCommissionRate } from '@/services/api';

const mockPrix: PrixConfig[] = [
  { id: 'enveloppe', type: 'enveloppe', label: 'Enveloppe', prixBase: 5.00, prixKm: 0.50, poidsMax: 0.5, description: 'Documents, lettres, petits plis' },
  { id: 'petit', type: 'petit', label: 'Petit Colis', prixBase: 8.00, prixKm: 0.80, poidsMax: 5, description: 'Petits paquets, livres, vetements' },
  { id: 'moyen', type: 'moyen', label: 'Moyen Colis', prixBase: 12.00, prixKm: 1.20, poidsMax: 15, description: 'Colis standard, electromenager petit' },
  { id: 'gros', type: 'gros', label: 'Gros Colis', prixBase: 20.00, prixKm: 1.80, poidsMax: 30, description: 'Gros paquets, meubles demontables' },
  { id: 'palette', type: 'palette', label: 'Palette', prixBase: 50.00, prixKm: 3.50, poidsMax: 500, description: 'Palettes, demenagement, volume important' },
];

const s = {
  page: { padding: '28px 32px', maxWidth: 1100 },
  header: { marginBottom: 24 },
  title: { fontSize: 26, fontWeight: 700 as const, color: '#1a1a2e' },
  subtitle: { fontSize: 14, color: '#6c757d', marginTop: 2 },
  card: {
    background: '#ffffff', borderRadius: 12,
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #f0f0f0',
    overflow: 'hidden' as const,
  },
  table: { width: '100%', borderCollapse: 'collapse' as const },
  th: {
    textAlign: 'left' as const, padding: '14px 18px', fontSize: 12, fontWeight: 600 as const,
    color: '#6c757d', textTransform: 'uppercase' as const, letterSpacing: '0.5px',
    borderBottom: '1px solid #f0f0f0', background: '#f8f9fa',
  },
  td: {
    padding: '16px 18px', fontSize: 14, color: '#1a1a2e',
    borderBottom: '1px solid #f5f5f5',
  },
  editBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px',
    background: '#f0f4ff', color: '#2E86DE', borderRadius: 6, fontSize: 12,
    fontWeight: 600 as const, border: 'none', cursor: 'pointer', transition: 'all 0.15s',
  },
  formGroup: { marginBottom: 18 },
  formLabel: {
    display: 'block', fontSize: 13, fontWeight: 600 as const, color: '#1a1a2e', marginBottom: 6,
  },
  formInput: {
    width: '100%', padding: '10px 14px', border: '2px solid #e2e8f0', borderRadius: 8,
    fontSize: 14, outline: 'none', transition: 'border-color 0.2s', color: '#1a1a2e',
  },
  formDesc: { fontSize: 12, color: '#6c757d', marginTop: 4 },
  priceTag: { fontWeight: 700 as const, color: '#1B3A5C' },
  weightTag: {
    display: 'inline-block', padding: '3px 10px', background: '#f0f0f0', borderRadius: 12,
    fontSize: 12, fontWeight: 600 as const, color: '#6c757d',
  },
  successMsg: {
    padding: '10px 16px', background: '#D4EDDA', borderRadius: 8,
    color: '#155724', fontSize: 13, fontWeight: 500 as const, marginBottom: 16,
    display: 'flex', alignItems: 'center', gap: 8,
  },
};

export default function Tarification() {
  const [prixConfig, setPrixConfig] = useState<PrixConfig[]>(mockPrix);
  const [editItem, setEditItem] = useState<PrixConfig | null>(null);
  const [editForm, setEditForm] = useState({ prixBase: '', prixKm: '', poidsMax: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [commissionRate, setCommissionRate] = useState(20);
  const [editingCommission, setEditingCommission] = useState(false);
  const [commissionInput, setCommissionInput] = useState('20');
  const [savingCommission, setSavingCommission] = useState(false);

  useEffect(() => {
    getPrixConfig().then((data) => {
      if (data.length > 0) setPrixConfig(data);
    });
    getCommissionRate().then((rate) => {
      setCommissionRate(Math.round(rate * 100));
      setCommissionInput(Math.round(rate * 100).toString());
    });
  }, []);

  const openEdit = (item: PrixConfig) => {
    setEditItem(item);
    setEditForm({
      prixBase: item.prixBase.toString(),
      prixKm: item.prixKm.toString(),
      poidsMax: item.poidsMax.toString(),
      description: item.description,
    });
    setSaved(false);
  };

  const handleSave = async () => {
    if (!editItem) return;
    setSaving(true);

    const updated: Partial<PrixConfig> = {
      prixBase: parseFloat(editForm.prixBase) || 0,
      prixKm: parseFloat(editForm.prixKm) || 0,
      poidsMax: parseFloat(editForm.poidsMax) || 0,
      description: editForm.description,
    };

    try {
      await updatePrixConfig(editItem.id, updated);
    } catch {
      // Firestore may not be configured
    }

    setPrixConfig((prev) =>
      prev.map((p) => (p.id === editItem.id ? { ...p, ...updated } : p))
    );
    setSaving(false);
    setSaved(true);
    setTimeout(() => {
      setEditItem(null);
    }, 1000);
  };

  const handleSaveCommission = async () => {
    const value = parseFloat(commissionInput);
    if (isNaN(value) || value < 0 || value > 100) return;
    setSavingCommission(true);
    try {
      await updateCommissionRate(value / 100);
      setCommissionRate(value);
      setEditingCommission(false);
    } catch {
      // Firestore may not be configured
    }
    setSavingCommission(false);
  };

  return (
    <div style={s.page} className="fade-in">
      <div style={s.header}>
        <h1 style={s.title}>Tarification</h1>
        <p style={s.subtitle}>Configuration des prix par type de colis</p>
      </div>

      {/* Commission Rate Card */}
      <div style={{ ...s.card, padding: '20px 24px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexDirection: 'row' as const }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 as const, color: '#6c757d', textTransform: 'uppercase' as const, letterSpacing: '0.5px', marginBottom: 6 }}>Taux de commission Coliway</div>
          {editingCommission ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                value={commissionInput}
                onChange={(e) => setCommissionInput(e.target.value)}
                style={{ ...s.formInput, width: 100, padding: '8px 12px' }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#2E86DE'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; }}
              />
              <span style={{ fontSize: 16, fontWeight: 600 as const, color: '#1a1a2e' }}>%</span>
              <button
                style={{ ...s.editBtn, background: '#2E86DE', color: '#fff' }}
                onClick={handleSaveCommission}
                disabled={savingCommission}
              >
                <Save size={14} /> {savingCommission ? 'Enregistrement...' : 'Enregistrer'}
              </button>
              <button
                style={{ ...s.editBtn, background: '#f0f0f0', color: '#6c757d' }}
                onClick={() => { setEditingCommission(false); setCommissionInput(commissionRate.toString()); }}
              >
                Annuler
              </button>
            </div>
          ) : (
            <div style={{ fontSize: 28, fontWeight: 700 as const, color: '#1B3A5C' }}>{commissionRate}%</div>
          )}
        </div>
        {!editingCommission && (
          <button style={s.editBtn} onClick={() => setEditingCommission(true)}>
            <Edit3 size={14} /> Modifier
          </button>
        )}
      </div>

      <div style={s.card}>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Type</th>
              <th style={s.th}>Prix de base</th>
              <th style={s.th}>Prix / km</th>
              <th style={s.th}>Poids max</th>
              <th style={s.th}>Description</th>
              <th style={{ ...s.th, textAlign: 'center' as const }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {prixConfig.map((item) => (
              <tr key={item.id}>
                <td style={{ ...s.td, fontWeight: 600 }}>{item.label}</td>
                <td style={s.td}>
                  <span style={s.priceTag}>{item.prixBase.toFixed(2)} EUR</span>
                </td>
                <td style={s.td}>
                  <span style={s.priceTag}>{item.prixKm.toFixed(2)} EUR</span>
                </td>
                <td style={s.td}>
                  <span style={s.weightTag}>{item.poidsMax} kg</span>
                </td>
                <td style={{ ...s.td, color: '#6c757d', maxWidth: 250 }}>{item.description}</td>
                <td style={{ ...s.td, textAlign: 'center' as const }}>
                  <button style={s.editBtn} onClick={() => openEdit(item)}>
                    <Edit3 size={14} /> Modifier
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit modal */}
      <Modal
        open={!!editItem}
        onClose={() => setEditItem(null)}
        title={editItem ? `Modifier - ${editItem.label}` : ''}
        width={480}
        footer={
          <div style={{ display: 'flex', gap: 10 }}>
            <ModalButton variant="secondary" onClick={() => setEditItem(null)}>
              Annuler
            </ModalButton>
            <ModalButton variant="primary" onClick={handleSave} disabled={saving}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Save size={14} /> {saving ? 'Enregistrement...' : 'Enregistrer'}
              </span>
            </ModalButton>
          </div>
        }
      >
        {editItem && (
          <div>
            {saved && (
              <div style={s.successMsg}>
                Prix mis a jour avec succes !
              </div>
            )}

            <div style={s.formGroup}>
              <label style={s.formLabel}>Prix de base (EUR)</label>
              <input
                type="number"
                step="0.01"
                value={editForm.prixBase}
                onChange={(e) => setEditForm({ ...editForm, prixBase: e.target.value })}
                style={s.formInput}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#2E86DE'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; }}
              />
              <div style={s.formDesc}>Prix fixe applique a chaque commande de ce type</div>
            </div>

            <div style={s.formGroup}>
              <label style={s.formLabel}>Prix par kilometre (EUR/km)</label>
              <input
                type="number"
                step="0.01"
                value={editForm.prixKm}
                onChange={(e) => setEditForm({ ...editForm, prixKm: e.target.value })}
                style={s.formInput}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#2E86DE'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; }}
              />
              <div style={s.formDesc}>Montant supplementaire par kilometre parcouru</div>
            </div>

            <div style={s.formGroup}>
              <label style={s.formLabel}>Poids maximum (kg)</label>
              <input
                type="number"
                step="0.1"
                value={editForm.poidsMax}
                onChange={(e) => setEditForm({ ...editForm, poidsMax: e.target.value })}
                style={s.formInput}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#2E86DE'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; }}
              />
            </div>

            <div style={s.formGroup}>
              <label style={s.formLabel}>Description</label>
              <input
                type="text"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                style={s.formInput}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#2E86DE'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; }}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
