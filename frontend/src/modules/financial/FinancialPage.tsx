import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../auth/useAuth';
import { Trash2, Plus, Receipt, FileText, Download, X, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { InvoicePdf } from '../invoices/InvoicePdf';
import { useToast } from '../../components/Toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';

type PaymentStatus = 'READY_TO_SEND' | 'SENT' | 'PENDING' | 'PAID' | 'LATE';

type InvoiceLine = {
  id: number;
  description: string;
  quantity: number;
  unitPrice: number;
};

type FinancialRecord = {
  id: string;
  kind: 'QUOTE' | 'INVOICE';
  amountHT: number;
  amountTTC: number;
  currency: string;
  status: PaymentStatus;
  externalRef: string | null;
  issuedAt: string;
  projectId: string;
  project?: { name: string; client?: { name: string } };
  lines?: InvoiceLine[] | any;
  paymentTerms?: string;
};

type PaginatedFinancialRecords = {
  data: FinancialRecord[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
};

type ProjectRef = { id: string; name: string };

const STATUS_LABELS: Record<PaymentStatus, string> = {
  READY_TO_SEND: "Prêt à envoyer",
  SENT: "Envoyé",
  PENDING: "En attente",
  PAID: "Payé",
  LATE: "En retard"
};

export function FinancialPage() {
  const { role } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const [showAdd, setShowAdd] = useState(false);
  const [rates, setRates] = useState<Record<string, number>>({ USD: 1 });
  const [previewRecord, setPreviewRecord] = useState<FinancialRecord | null>(null);

  // New Record Form State
  const [kind, setKind] = useState<'QUOTE' | 'INVOICE'>('QUOTE');
  const [projectId, setProjectId] = useState('');
  const [initStatus, setInitStatus] = useState<PaymentStatus>('READY_TO_SEND');
  const [currency, setCurrency] = useState('USD');
  const [paymentTerms, setPaymentTerms] = useState(
    "Conditions de paiement à réception.\nEn cas de retard, une pénalité de 10% du tarif sera appliquée."
  );
  const [lines, setLines] = useState<InvoiceLine[]>([
    { id: 1, description: '', quantity: 1, unitPrice: 0 }
  ]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const { data: exchangeRates } = useQuery({
    queryKey: ['exchangeRates'],
    queryFn: async () => {
      try {
        const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const data = await res.json();
        return data.rates || { USD: 1 };
      } catch (err) {
        return { USD: 1 };
      }
    },
    staleTime: 3600000 // Cache for 1 hour
  });

  useEffect(() => {
    if (exchangeRates) setRates(exchangeRates);
  }, [exchangeRates]);

  const { data, isLoading } = useQuery({
    queryKey: ['financial', page, debouncedSearch],
    queryFn: () => api.get<PaginatedFinancialRecords>(`/financial?page=${page}&limit=${limit}${debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : ''}`)
  });

  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get<ProjectRef[]>('/projects')
  });

  const recordsList = data?.data || [];
  const projects = projectsData || [];

  const updateLine = (id: number, patch: Partial<InvoiceLine>) => {
    setLines(prev => prev.map(l => (l.id === id ? { ...l, ...patch } : l)));
  };

  const addLine = () => {
    setLines(prev => [
      ...prev,
      { id: prev.length ? prev[prev.length - 1].id + 1 : 1, description: '', quantity: 1, unitPrice: 0 }
    ]);
  };

  const removeLine = (id: number) => {
    setLines(prev => prev.filter(l => l.id !== id));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;

    const amountHT = lines.reduce((sum, l) => sum + (l.quantity * l.unitPrice), 0);
    const amountTTC = amountHT; // No tax calculated currently to match Generator

    try {
      await api.post('/financial', {
        kind,
        projectId,
        amountHT,
        amountTTC,
        currency,
        status: initStatus,
        lines,
        paymentTerms
      });
      setProjectId('');
      setKind('QUOTE');
      setInitStatus('READY_TO_SEND');
      setLines([{ id: 1, description: '', quantity: 1, unitPrice: 0 }]);
      showToast('Document créé !', 'success');
      queryClient.invalidateQueries({ queryKey: ['financial'] });
    } catch (err) {
      showToast("Erreur lors de la création.", "error");
    }
  };

  const handleStatusChange = async (id: string, newStatus: PaymentStatus) => {
    try {
      await api.put(`/financial/${id}`, { status: newStatus });
      showToast('Statut mis à jour !', 'success');
      queryClient.invalidateQueries({ queryKey: ['financial'] });
    } catch (err) {
      showToast("Erreur lors du changement de statut.", "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Supprimer ce document ?")) return;
    try {
      await api.delete(`/financial/${id}`);
      showToast('Document supprimé.', 'success');
      queryClient.invalidateQueries({ queryKey: ['financial'] });
    } catch {
      showToast("Erreur lors de la suppression.", "error");
    }
  };

  const toUSD = (amount: number, curr: string) => {
    if (curr === 'USD' || !rates[curr]) return amount;
    return amount / rates[curr];
  };

  // We only compute totals on the current page to avoid massive calculations. 
  // For global totals, a dedicated dashboard endpoint is recommended.
  const totalPaid = recordsList
    .filter(r => r.kind === 'INVOICE' && r.status === 'PAID')
    .reduce((sum, r) => sum + toUSD(Number(r.amountTTC || 0), r.currency), 0);

  const totalSent = recordsList
    .filter(r => r.kind === 'INVOICE' && r.status === 'SENT')
    .reduce((sum, r) => sum + toUSD(Number(r.amountTTC || 0), r.currency), 0);

  return (
    <div className="page">
      <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Factures & Devis</h1>
          <p>Générez et suivez les documents financiers liés aux projets.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div className="search-box">
            <input 
              type="text" 
              placeholder="Rechercher par Réf ou Projet..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ padding: '0.6rem', width: '250px', borderRadius: '0.75rem' }}
            />
          </div>
          {role === 'ADMIN' && (
            <button className="btn-primary" onClick={() => setShowAdd(!showAdd)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: 'fit-content' }}>
              <Plus size={18} /> {showAdd ? 'Fermer' : 'Créer Devis/Facture'}
            </button>
          )}
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="card glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1.5rem' }}>
          <div style={{ padding: '1rem', background: 'rgba(34, 197, 94, 0.1)', color: '#4ade80', borderRadius: '1rem' }}>
            <Receipt size={28} />
          </div>
          <div>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem', fontWeight: 500 }}>Revenus page courante</p>
            <h3 style={{ margin: '0.25rem 0 0', fontSize: '1.75rem', fontWeight: 700 }}>
              {totalPaid.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}
            </h3>
          </div>
        </div>

        <div className="card glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1.5rem' }}>
          <div style={{ padding: '1rem', background: 'rgba(245, 158, 11, 0.1)', color: '#fbbf24', borderRadius: '1rem' }}>
            <FileText size={28} />
          </div>
          <div>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem', fontWeight: 500 }}>Envoyé page courante (SENT)</p>
            <h3 style={{ margin: '0.25rem 0 0', fontSize: '1.75rem', fontWeight: 700 }}>
              {totalSent.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}
            </h3>
          </div>
        </div>
      </div>

      {showAdd && role === 'ADMIN' && (
        <section className="card glass-card" style={{ marginBottom: '1.5rem' }}>
          <h2>Générateur de Document</h2>
          <form onSubmit={handleCreate}>
            <div className="form-grid" style={{ marginBottom: '1.5rem' }}>
              <label>
                Projet *
                <select value={projectId} onChange={e => setProjectId(e.target.value)} required>
                  <option value="">Sélectionner un projet...</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </label>
              <label>
                Type *
                <select value={kind} onChange={e => setKind(e.target.value as any)}>
                  <option value="QUOTE">Devis</option>
                  <option value="INVOICE">Facture</option>
                </select>
              </label>
              <label>
                Devise
                <select value={currency} onChange={e => setCurrency(e.target.value)}>
                  <option value="USD">$ USD</option>
                  <option value="GNF">GNF</option>
                </select>
              </label>
              <label>
                Statut initial
                <select value={initStatus} onChange={e => setInitStatus(e.target.value as PaymentStatus)}>
                  {Object.entries(STATUS_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </label>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Lignes de facturation</h3>
              <div className="table-responsive">
                <table className="lines-table" style={{ width: '100%', marginBottom: '1rem' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', color: '#94a3b8', fontSize: '0.85rem' }}>
                      <th>Description</th>
                      <th style={{ width: '120px' }}>Prix U.</th>
                      <th style={{ width: '80px' }}>Qté</th>
                      <th style={{ width: '120px' }}>Total</th>
                      <th style={{ width: '50px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line) => (
                      <tr key={line.id}>
                        <td>
                          <input
                            value={line.description}
                            onChange={e => updateLine(line.id, { description: e.target.value })}
                            placeholder="Description détaillée de la prestation"
                            style={{ padding: '0.4rem' }}
                            required
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0" step="0.01"
                            value={line.unitPrice}
                            onChange={e => updateLine(line.id, { unitPrice: Number(e.target.value) || 0 })}
                            style={{ padding: '0.4rem' }}
                            required
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="1"
                            value={line.quantity}
                            onChange={e => updateLine(line.id, { quantity: Number(e.target.value) || 1 })}
                            style={{ padding: '0.4rem' }}
                            required
                          />
                        </td>
                        <td style={{ fontWeight: '500', fontSize: '0.9rem' }}>
                          {(line.quantity * line.unitPrice).toFixed(2)}
                        </td>
                        <td>
                          <button type="button" className="ghost" onClick={() => removeLine(line.id)} disabled={lines.length === 1} style={{ padding: '0.4rem', color: '#ef4444' }}>
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" className="ghost" onClick={addLine} style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}>
                + Ajouter une ligne
              </button>
            </div>

            <div className="layout-split" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', marginBottom: '1.5rem' }}>
              <div>
                <label>
                  Conditions de paiement / Mentions légales
                  <textarea
                    value={paymentTerms}
                    onChange={e => setPaymentTerms(e.target.value)}
                    rows={4}
                    style={{ marginTop: '0.5rem' }}
                  />
                </label>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: '#94a3b8' }}>Total HT</span>
                  <span style={{ fontWeight: 600 }}>{lines.reduce((sum, l) => sum + (l.quantity * l.unitPrice), 0).toFixed(2)} {currency}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
                  <span style={{ color: '#94a3b8' }}>TVA</span>
                  <span style={{ fontWeight: 600 }}>0.00 {currency}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem' }}>
                  <span style={{ color: '#fff' }}>Total TTC</span>
                  <span style={{ fontWeight: 700, color: '#10b981' }}>{lines.reduce((sum, l) => sum + (l.quantity * l.unitPrice), 0).toFixed(2)} {currency}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button type="button" className="ghost" onClick={() => setShowAdd(false)}>Annuler</button>
              <button type="submit" className="btn-primary" style={{ width: 'fit-content' }}>Générer le document (réf. auto)</button>
            </div>
          </form>
        </section>
      )}

      <section className="card glass-card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Réf</th>
                <th>Projet</th>
                <th>Type</th>
                <th>Montant (TTC)</th>
                <th>Date d'émission</th>
                <th>Statut</th>
                <th align="right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    <Loader2 className="spinner" size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto' }} />
                  </td>
                </tr>
              ) : recordsList.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                    Aucun document trouvé.
                  </td>
                </tr>
              ) : (
                recordsList.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{r.externalRef || 'N/A'}</td>
                    <td>{r.project?.name}</td>
                    <td>
                      <span style={{ padding: '0.2rem 0.6rem', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 600, background: r.kind === 'QUOTE' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(139, 92, 246, 0.15)', color: r.kind === 'QUOTE' ? '#60a5fa' : '#a78bfa' }}>
                        {r.kind === 'QUOTE' ? 'Devis' : 'Facture'}
                      </span>
                    </td>
                    <td style={{ fontWeight: '500' }}>{Number(r.amountTTC).toLocaleString()} {r.currency}</td>
                    <td>{new Date(r.issuedAt).toLocaleDateString()}</td>
                    <td>
                      {role === 'ADMIN' ? (
                        <select 
                          value={r.status}
                          onChange={e => handleStatusChange(r.id, e.target.value as PaymentStatus)}
                          className={`status status-${r.status.toLowerCase()}`}
                          style={{ border: 'none', outline: 'none', cursor: 'pointer', appearance: 'none', paddingRight: '1rem' }}
                        >
                          {Object.entries(STATUS_LABELS).map(([val, label]) => (
                            <option key={val} value={val} style={{ background: '#1e293b', color: '#fff' }}>{label}</option>
                          ))}
                        </select>
                      ) : (
                        <span className={`status status-${r.status.toLowerCase()}`}>
                          {STATUS_LABELS[r.status] || r.status}
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="ghost"
                          title="Télécharger Document"
                          onClick={() => setPreviewRecord(r)}
                          style={{ padding: '0.3rem', color: '#6366f1' }}
                        >
                          <Download size={14} />
                        </button>
                        
                        {role === 'ADMIN' && (
                          <button
                            type="button"
                            className="ghost"
                            onClick={() => handleDelete(r.id)}
                            title="Supprimer"
                            style={{ padding: '0.3rem', color: '#ef4444' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          
          {data && data.totalPages > 1 && (
            <div style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Total: {data.totalCount} documents
              </span>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button 
                  className="ghost" 
                  disabled={page === 1} 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  style={{ padding: '0.3rem' }}
                >
                  <ChevronLeft size={16} />
                </button>
                <span style={{ fontSize: '0.85rem' }}>Page {page} / {data.totalPages}</span>
                <button 
                  className="ghost" 
                  disabled={page >= data.totalPages} 
                  onClick={() => setPage(p => p + 1)}
                  style={{ padding: '0.3rem' }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* PDF Modal */}
      {previewRecord && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="card glass-card" style={{ width: '400px', background: '#fff', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 600, color: '#0f172a' }}>Télécharger le document</h2>
              <button type="button" className="ghost" onClick={() => setPreviewRecord(null)} style={{ padding: '0.3rem', margin: '-0.3rem' }}>
                <X size={18} color="#0f172a" />
              </button>
            </div>
            
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Vous êtes sur le point de générer le document PDF pour la référence <strong>{previewRecord.externalRef || 'N/A'}</strong>.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" className="ghost" onClick={() => setPreviewRecord(null)} style={{ color: '#0f172a' }}>
                Annuler
              </button>
              <PDFDownloadLink
                document={
                  <InvoicePdf
                    clientName={previewRecord.project?.client?.name || 'Client'}
                    summary={previewRecord.kind === 'QUOTE' ? 'Devis prestation de services' : 'Prestation facturée'}
                    currency={previewRecord.currency || 'USD'}
                    quoteNumber={previewRecord.externalRef || ''}
                    quoteDate={new Date(previewRecord.issuedAt).toLocaleDateString('fr-FR')}
                    lines={previewRecord.lines && Array.isArray(previewRecord.lines) ? previewRecord.lines : [{
                      id: 1,
                      description: `Prestation globale pour le projet : ${previewRecord.project?.name}`,
                      quantity: 1,
                      unitPrice: Number(previewRecord.amountHT)
                    }]}
                    taxAmount={Number(previewRecord.amountTTC) - Number(previewRecord.amountHT)}
                    paymentTerms={previewRecord.paymentTerms || "Facture payable à réception."}
                  />
                }
                fileName={`${previewRecord.externalRef || previewRecord.kind}.pdf`}
              >
                {/* @ts-ignore */}
                {({ loading }) => (
                  <button type="button" className="btn-primary" disabled={loading} style={{ width: 'fit-content' }}>
                    {loading ? 'Génération...' : 'Télécharger le PDF'}
                  </button>
                )}
              </PDFDownloadLink>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
