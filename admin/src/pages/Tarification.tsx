import React, { useState, useEffect } from 'react';
import { Edit3, Save, RotateCcw, User, Briefcase, Info } from 'lucide-react';
import {
  getCommissionRate,
  updateCommissionRate,
  getPricingConfig,
  savePricingConfig,
  PricingGrid,
} from '@/services/api';

type ClientType = 'particulier' | 'professionnel';

interface GridRow {
  base: string;
  perKm0: string;
  perKm1: string;
  perKm2: string;
}

type EditableGrid = Record<string, GridRow>;

const COLIS_TYPES = [
  { id: 'enveloppe', label: 'Enveloppe', icon: '✉️', poidsMax: 0.5 },
  { id: 'petit', label: 'Petit Colis', icon: '📦', poidsMax: 5 },
  { id: 'moyen', label: 'Moyen Colis', icon: '📫', poidsMax: 15 },
  { id: 'gros', label: 'Gros Colis', icon: '🗃️', poidsMax: 30 },
  { id: 'palette', label: 'Palette', icon: '🏗️', poidsMax: 500 },
];

const DEFAULT_PARTICULIER: EditableGrid = {
  enveloppe: { base: '3.50', perKm0: '0.80', perKm1: '0.60', perKm2: '0.50' },
  petit:     { base: '4.50', perKm0: '1.00', perKm1: '0.80', perKm2: '0.65' },
  moyen:     { base: '6.00', perKm0: '1.30', perKm1: '1.00', perKm2: '0.85' },
  gros:      { base: '8.50', perKm0: '1.80', perKm1: '1.40', perKm2: '1.15' },
  palette:   { base: '15.00', perKm0: '3.00', perKm1: '2.50', perKm2: '2.00' },
};

const DEFAULT_PRO: EditableGrid = {
  enveloppe: { base: '3.00', perKm0: '0.70', perKm1: '0.50', perKm2: '0.40' },
  petit:     { base: '3.80', perKm0: '0.85', perKm1: '0.65', perKm2: '0.55' },
  moyen:     { base: '5.00', perKm0: '1.10', perKm1: '0.85', perKm2: '0.70' },
  gros:      { base: '7.00', perKm0: '1.50', perKm1: '1.15', perKm2: '0.95' },
  palette:   { base: '12.00', perKm0: '2.50', perKm1: '2.00', perKm2: '1.60' },
};

function firestoreToGrid(data: PricingGrid): EditableGrid {
  const grid: EditableGrid = {};
  for (const key of Object.keys(data)) {
    const e = data[key];
    grid[key] = {
      base: e.base.toFixed(2),
      perKm0: e.perKm[0].toFixed(2),
      perKm1: e.perKm[1].toFixed(2),
      perKm2: e.perKm[2].toFixed(2),
    };
  }
  return grid;
}

function gridToFirestore(grid: EditableGrid): PricingGrid {
  const result: PricingGrid = {};
  for (const key of Object.keys(grid)) {
    const row = grid[key];
    result[key] = {
      base: parseFloat(row.base) || 0,
      perKm: [
        parseFloat(row.perKm0) || 0,
        parseFloat(row.perKm1) || 0,
        parseFloat(row.perKm2) || 0,
      ],
      tiers: [10, 30],
    };
  }
  return result;
}

function PricingField({ label, value, unit, onChange }: { label: string; value: string; unit: string; onChange: (v: string) => void }) {
  return (
    <div className="tarif-field">
      <label className="tarif-field-label">{label}</label>
      <div className="tarif-input-wrapper">
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ''))}
          className="tarif-input"
        />
        <span className="tarif-unit">{unit}</span>
      </div>
    </div>
  );
}

export default function Tarification() {
  const [activeTab, setActiveTab] = useState<ClientType>('particulier');
  const [particulierGrid, setParticulierGrid] = useState<EditableGrid>(DEFAULT_PARTICULIER);
  const [proGrid, setProGrid] = useState<EditableGrid>(DEFAULT_PRO);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [commissionRate, setCommissionRate] = useState(20);
  const [editingCommission, setEditingCommission] = useState(false);
  const [commissionInput, setCommissionInput] = useState('20');
  const [savingCommission, setSavingCommission] = useState(false);

  useEffect(() => {
    Promise.all([
      getPricingConfig().then((config) => {
        if (config) {
          if (config.particulier && Object.keys(config.particulier).length > 0) {
            setParticulierGrid(firestoreToGrid(config.particulier));
          }
          if (config.professionnel && Object.keys(config.professionnel).length > 0) {
            setProGrid(firestoreToGrid(config.professionnel));
          }
        }
      }),
      getCommissionRate().then((rate) => {
        setCommissionRate(Math.round(rate * 100));
        setCommissionInput(Math.round(rate * 100).toString());
      }),
    ]).finally(() => setLoading(false));
  }, []);

  const grid = activeTab === 'particulier' ? particulierGrid : proGrid;
  const setGrid = activeTab === 'particulier' ? setParticulierGrid : setProGrid;

  const updateField = (colisId: string, field: keyof GridRow, value: string) => {
    setGrid((prev) => ({
      ...prev,
      [colisId]: { ...prev[colisId], [field]: value },
    }));
  };

  const handleSave = async () => {
    for (const colis of COLIS_TYPES) {
      const row = grid[colis.id];
      if (!row) continue;
      for (const [, val] of Object.entries(row)) {
        const num = parseFloat(val);
        if (isNaN(num) || num < 0) {
          alert(`Valeur invalide pour ${colis.label}`);
          return;
        }
      }
    }

    setSaving(true);
    try {
      await savePricingConfig({
        particulier: gridToFirestore(particulierGrid),
        professionnel: gridToFirestore(proGrid),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Error saving pricing:', err);
      alert('Erreur lors de la sauvegarde des tarifs.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!confirm(`Remettre les tarifs ${activeTab} par defaut ?`)) return;
    if (activeTab === 'particulier') {
      setParticulierGrid({ ...DEFAULT_PARTICULIER });
    } else {
      setProGrid({ ...DEFAULT_PRO });
    }
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
      // ignore
    }
    setSavingCommission(false);
  };

  if (loading) {
    return (
      <div className="tarif-page">
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div className="tarif-spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="tarif-page fade-in">
      <style>{responsiveCSS}</style>

      <div className="tarif-header">
        <h1 className="tarif-title">Tarification</h1>
        <p className="tarif-subtitle">Configuration des prix par type de colis et type de client</p>
      </div>

      {/* Commission */}
      <div className="tarif-commission-card">
        <div style={{ flex: 1 }}>
          <div className="tarif-commission-label">Taux de commission Coliway</div>
          {editingCommission ? (
            <div className="tarif-commission-edit">
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                value={commissionInput}
                onChange={(e) => setCommissionInput(e.target.value)}
                className="tarif-input"
                style={{ width: 80 }}
              />
              <span style={{ fontSize: 16, fontWeight: 600, color: '#1a1a2e' }}>%</span>
              <button className="tarif-btn-primary tarif-btn-sm" onClick={handleSaveCommission} disabled={savingCommission}>
                <Save size={14} /> {savingCommission ? '...' : 'OK'}
              </button>
              <button className="tarif-btn-secondary tarif-btn-sm" onClick={() => { setEditingCommission(false); setCommissionInput(commissionRate.toString()); }}>
                Annuler
              </button>
            </div>
          ) : (
            <div className="tarif-commission-value">{commissionRate}%</div>
          )}
        </div>
        {!editingCommission && (
          <button className="tarif-btn-edit" onClick={() => setEditingCommission(true)}>
            <Edit3 size={14} /> Modifier
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="tarif-tabs">
        <button
          className={`tarif-tab ${activeTab === 'particulier' ? 'tarif-tab-active' : ''}`}
          onClick={() => setActiveTab('particulier')}
        >
          <User size={16} />
          <span>Particulier</span>
        </button>
        <button
          className={`tarif-tab ${activeTab === 'professionnel' ? 'tarif-tab-active' : ''}`}
          onClick={() => setActiveTab('professionnel')}
        >
          <Briefcase size={16} />
          <span>Professionnel</span>
        </button>
      </div>

      {saved && (
        <div className="tarif-success">
          ✓ Tarifs enregistres avec succes !
        </div>
      )}

      {/* Info */}
      <div className="tarif-info">
        <Info size={15} />
        <span>Paliers : <strong>0–10 km</strong> | <strong>10–30 km</strong> | <strong>+30 km</strong></span>
      </div>

      {/* Cards for each colis type */}
      <div className="tarif-cards">
        {COLIS_TYPES.map((colis) => {
          const row = grid[colis.id];
          if (!row) return null;
          return (
            <div key={colis.id} className="tarif-colis-card">
              <div className="tarif-colis-header">
                <span className="tarif-colis-icon">{colis.icon}</span>
                <div>
                  <div className="tarif-colis-name">{colis.label}</div>
                  <div className="tarif-colis-weight">max {colis.poidsMax} kg</div>
                </div>
              </div>
              <div className="tarif-fields-grid">
                <PricingField label="Base" value={row.base} unit="€" onChange={(v) => updateField(colis.id, 'base', v)} />
                <PricingField label="0–10 km" value={row.perKm0} unit="€/km" onChange={(v) => updateField(colis.id, 'perKm0', v)} />
                <PricingField label="10–30 km" value={row.perKm1} unit="€/km" onChange={(v) => updateField(colis.id, 'perKm1', v)} />
                <PricingField label="+30 km" value={row.perKm2} unit="€/km" onChange={(v) => updateField(colis.id, 'perKm2', v)} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="tarif-actions">
        <button
          className="tarif-btn-primary"
          onClick={handleSave}
          disabled={saving}
          style={saving ? { opacity: 0.7 } : {}}
        >
          <Save size={16} />
          <span>{saving ? 'Enregistrement...' : 'Enregistrer les tarifs'}</span>
        </button>
        <button className="tarif-btn-danger" onClick={handleReset}>
          <RotateCcw size={16} />
          <span>Reinitialiser</span>
        </button>
      </div>
    </div>
  );
}

const responsiveCSS = `
  .tarif-page {
    padding: 24px 28px;
    max-width: 1100px;
    width: 100%;
    box-sizing: border-box;
  }
  .tarif-header { margin-bottom: 20px; }
  .tarif-title { font-size: 24px; font-weight: 700; color: #1a1a2e; margin: 0; }
  .tarif-subtitle { font-size: 14px; color: #6c757d; margin-top: 2px; }

  /* Commission */
  .tarif-commission-card {
    background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    border: 1px solid #f0f0f0; padding: 16px 20px; margin-bottom: 20px;
    display: flex; align-items: center; justify-content: space-between;
    flex-wrap: wrap; gap: 12px;
  }
  .tarif-commission-label {
    font-size: 11px; font-weight: 600; color: #6c757d;
    text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;
  }
  .tarif-commission-value { font-size: 26px; font-weight: 700; color: #1B3A5C; }
  .tarif-commission-edit { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

  /* Tabs */
  .tarif-tabs { display: flex; gap: 10px; margin-bottom: 16px; }
  .tarif-tab {
    flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px;
    padding: 12px 14px; border-radius: 10px; font-size: 14px; font-weight: 600;
    background: #fff; color: #1B3A5C; border: 2px solid #1B3A5C;
    cursor: pointer; transition: all 0.2s;
  }
  .tarif-tab-active {
    background: #1B3A5C !important; color: #fff !important;
  }

  /* Info */
  .tarif-info {
    display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
    background: #EBF5FB; padding: 10px 14px; border-radius: 8px;
    font-size: 12px; color: #2E86DE; margin-bottom: 16px;
  }

  .tarif-success {
    padding: 10px 16px; background: #D4EDDA; border-radius: 8px;
    color: #155724; font-size: 13px; font-weight: 500; margin-bottom: 14px;
  }

  /* Colis cards */
  .tarif-cards { display: flex; flex-direction: column; gap: 12px; }
  .tarif-colis-card {
    background: #fff; border-radius: 12px; padding: 16px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08); border: 1px solid #f0f0f0;
  }
  .tarif-colis-header {
    display: flex; align-items: center; gap: 10px; margin-bottom: 12px;
  }
  .tarif-colis-icon { font-size: 22px; }
  .tarif-colis-name { font-size: 15px; font-weight: 700; color: #1a1a2e; }
  .tarif-colis-weight { font-size: 11px; color: #6c757d; }

  .tarif-fields-grid {
    display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;
  }

  .tarif-field {}
  .tarif-field-label {
    display: block; font-size: 11px; font-weight: 600; color: #6c757d;
    text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.3px;
  }
  .tarif-input-wrapper {
    display: flex; align-items: center;
    background: #f8f9fa; border-radius: 8px; border: 2px solid #e2e8f0;
    padding: 0 8px; transition: border-color 0.2s;
  }
  .tarif-input-wrapper:focus-within { border-color: #2E86DE; }
  .tarif-input {
    border: none; background: transparent; padding: 8px 0;
    font-size: 14px; font-weight: 700; color: #1B3A5C;
    width: 100%; min-width: 0; outline: none;
  }
  .tarif-unit { font-size: 11px; color: #6c757d; font-weight: 500; white-space: nowrap; }

  /* Actions */
  .tarif-actions {
    display: flex; gap: 12px; margin-top: 20px; flex-wrap: wrap;
  }
  .tarif-btn-primary {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 11px 22px; background: #2E86DE; color: #fff;
    border-radius: 10px; font-size: 14px; font-weight: 600;
    border: none; cursor: pointer; transition: all 0.2s;
  }
  .tarif-btn-primary:hover { background: #2574c0; }
  .tarif-btn-sm { padding: 7px 14px; font-size: 12px; border-radius: 8px; }
  .tarif-btn-secondary {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 7px 14px; background: #f0f0f0; color: #6c757d;
    border-radius: 8px; font-size: 12px; font-weight: 600;
    border: none; cursor: pointer;
  }
  .tarif-btn-edit {
    display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px;
    background: #f0f4ff; color: #2E86DE; border-radius: 6px; font-size: 12px;
    font-weight: 600; border: none; cursor: pointer;
  }
  .tarif-btn-danger {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 11px 20px; background: #fff; color: #E74C3C;
    border-radius: 10px; font-size: 14px; font-weight: 600;
    border: 2px solid #E74C3C; cursor: pointer;
  }

  .tarif-spinner {
    width: 40px; height: 40px;
    border: 4px solid #e2e8f0; border-top-color: #2E86DE;
    border-radius: 50%; animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ─── Mobile responsive ─── */
  @media (max-width: 768px) {
    .tarif-page { padding: 16px 14px; }
    .tarif-title { font-size: 20px; }
    .tarif-subtitle { font-size: 12px; }

    .tarif-commission-card {
      flex-direction: column; align-items: flex-start; padding: 14px 16px;
    }
    .tarif-commission-value { font-size: 22px; }
    .tarif-commission-edit { flex-wrap: wrap; }

    .tarif-tabs { gap: 8px; }
    .tarif-tab { padding: 10px 8px; font-size: 13px; gap: 4px; }

    .tarif-fields-grid {
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
    }

    .tarif-colis-card { padding: 14px; }
    .tarif-colis-name { font-size: 14px; }

    .tarif-actions { flex-direction: column; }
    .tarif-btn-primary, .tarif-btn-danger {
      width: 100%; justify-content: center;
    }
  }

  @media (max-width: 400px) {
    .tarif-page { padding: 12px 10px; }
    .tarif-fields-grid {
      grid-template-columns: 1fr 1fr;
      gap: 6px;
    }
    .tarif-input { font-size: 13px; padding: 7px 0; }
    .tarif-tab { font-size: 12px; padding: 9px 6px; }
  }
`;
