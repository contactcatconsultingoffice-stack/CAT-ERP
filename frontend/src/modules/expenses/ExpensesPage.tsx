import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  TrendingDown,
  ArrowDownRight,
  TrendingUp,
  X,
  CreditCard,
  Briefcase,
  Monitor,
  Megaphone,
  Plane,
  Users
} from 'lucide-react';
import { motion } from 'framer-motion';
import { AnimatedNumber } from '../../components/AnimatedNumber';
import { KpiSkeleton } from '../../components/Skeleton';
import { useToast } from '../../components/Toast';
import { useAuth } from '../../auth/useAuth';

type ExpenseCategory = 'LOGICIELS_SAAS' | 'DEPLACEMENTS' | 'SOUS_TRAITANCE' | 'MARKETING' | 'SALAIRES' | 'OPERATIONNEL';

type FinancialRecord = {
  id: string;
  kind: 'EXPENSE';
  amountTTC: string;
  amountHT: string;
  currency: string;
  status: 'PENDING' | 'PAID' | 'LATE';
  issuedAt: string;
  expenseCategory?: ExpenseCategory | null;
  project?: { name: string };
  externalRef?: string;
  lines?: { description: string }[];
};

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  LOGICIELS_SAAS: 'Abonnements & Logiciels (SaaS)',
  DEPLACEMENTS: 'Déplacements & Repas',
  SOUS_TRAITANCE: 'Sous-traitance & Freelances',
  MARKETING: 'Marketing & Pub',
  SALAIRES: 'Salaires & Honoraires',
  OPERATIONNEL: 'Frais Opérationnels (Loyer, etc.)'
};

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  LOGICIELS_SAAS: '#8b5cf6',
  DEPLACEMENTS: '#f59e0b',
  SOUS_TRAITANCE: '#ec4899',
  MARKETING: '#10b981',
  SALAIRES: '#3b82f6',
  OPERATIONNEL: '#64748b'
};

export function ExpensesPage() {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  
  // Form State
  const [amount, setAmount] = useState<number | ''>('');
  const [currency, setCurrency] = useState('USD');
  const [category, setCategory] = useState<ExpenseCategory>('OPERATIONNEL');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const [status, setStatus] = useState<'PENDING' | 'PAID'>('PAID');
  const [isSaving, setIsSaving] = useState(false);

  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const { data: expensesData, isLoading } = useQuery({
    queryKey: ['expensesList'],
    queryFn: () => api.get<{ data: FinancialRecord[] }>('/financial?kind=EXPENSE&limit=1000'),
  });

  const { data: projectsData } = useQuery({
    queryKey: ['projects-mini'],
    queryFn: () => api.get<{ data: { id: string; name: string }[] }>('/projects'),
  });

  // Rates for unified currency display
  const { data: ratesData } = useQuery({
    queryKey: ['rates'],
    queryFn: () => api.get<{ rates: Record<string, number> }>('/rates'),
    staleTime: 6 * 60 * 60 * 1000,
  });
  const rates = ratesData?.rates ?? { USD: 1, GNF: 8600 };

  const toUSD = (amt: number, curr: string) => {
    if (!rates || curr === 'USD') return amt;
    return amt / (rates[curr] || 1);
  };

  const records: FinancialRecord[] = expensesData?.data || [];
  const projects = projectsData?.data || [];

  const totalExpensesUSD = records.reduce((acc, r) => acc + toUSD(Number(r.amountTTC), r.currency), 0);
  
  const pendingExpensesUSD = records
    .filter(r => r.status === 'PENDING')
    .reduce((acc, r) => acc + toUSD(Number(r.amountTTC), r.currency), 0);

  const processExpensesByCategory = () => {
    const map: Record<string, number> = {};
    records.forEach(r => {
      const cat = r.expenseCategory || 'OPERATIONNEL';
      map[cat] = (map[cat] || 0) + toUSD(Number(r.amountTTC), r.currency);
    });
    return Object.entries(map).map(([key, value]) => ({
      name: CATEGORY_LABELS[key as ExpenseCategory] || key,
      value,
      color: CATEGORY_COLORS[key as ExpenseCategory] || '#64748b'
    })).sort((a, b) => b.value - a.value);
  };

  const chartData = processExpensesByCategory();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;
    setIsSaving(true);
    try {
      await api.post('/financial', {
        kind: 'EXPENSE',
        amountHT: Number(amount),
        amountTTC: Number(amount),
        currency,
        status,
        projectId: projectId || undefined,
        expenseCategory: category,
        lines: [{ description }]
      });
      showToast('Dépense enregistrée', 'success');
      setShowModal(false);
      setAmount('');
      setDescription('');
      setProjectId('');
      queryClient.invalidateQueries({ queryKey: ['expensesList'] });
      queryClient.invalidateQueries({ queryKey: ['financialSummary'] }); // Update global finances
    } catch (err) {
      console.error('[ExpensesPage] Failed to save expense:', err);
      showToast('Erreur lors de la sauvegarde.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="page"><KpiSkeleton count={3} /></div>;

  return (
    <div className="page">
      <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Dépenses & Charges</h1>
          <p>Suivi des sorties d'argent, abonnements et coûts d'exploitation.</p>
        </div>
        {(user?.role === 'ADMIN' || user?.isSuperAdmin) && (
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            + Saisir une dépense
          </button>
        )}
      </header>

      {/* KPI Cards */}
      <section className="kpi-grid" style={{ marginBottom: '2rem', gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="kpi card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Charges Globales</span>
            <div style={{ padding: '0.4rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '0.5rem' }}>
              <TrendingDown size={18} />
            </div>
          </div>
          <p style={{ fontSize: '1.75rem', fontWeight: 700 }}>
            $<AnimatedNumber value={Math.round(totalExpensesUSD)} />
          </p>
          <span style={{ fontSize: '0.8rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
            <ArrowDownRight size={14} /> Total facturé & payé
          </span>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="kpi card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Charges en Attente</span>
            <div style={{ padding: '0.4rem', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', borderRadius: '0.5rem' }}>
              <CreditCard size={18} />
            </div>
          </div>
          <p style={{ fontSize: '1.75rem', fontWeight: 700 }}>
            $<AnimatedNumber value={Math.round(pendingExpensesUSD)} />
          </p>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Dettes non payées relatives</span>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="kpi card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Poste le plus lourd</span>
            <div style={{ padding: '0.4rem', background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', borderRadius: '0.5rem' }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <p style={{ fontSize: '1.25rem', fontWeight: 700, margin: '8px 0', color: chartData[0]?.color || 'var(--text-primary)' }}>
            {chartData[0]?.name || 'N/A'}
          </p>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Catégorie dominante</span>
        </motion.div>
      </section>

      {/* Analytics Chart */}
      <section className="card" style={{ padding: '2rem', marginBottom: '2rem', minHeight: '350px' }}>
        <h3 style={{ marginBottom: '1.5rem', flex: 1 }}>Répartition Analytique des Dépenses</h3>
        {chartData.length > 0 ? (
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-color)" />
                <XAxis type="number" tick={{ fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} tickFormatter={val => `$${val}`} />
                <YAxis dataKey="name" type="category" width={180} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ background: 'var(--bg-sidebar)', borderRadius: '12px', border: '1px solid var(--border-color)' }}
                  formatter={(val: any) => [`$${Number(val).toLocaleString()}`, 'Dépense ($USD)']}
                />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={24}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Aucune donnée.</div>
        )}
      </section>

      {/* Expense Listing */}
      <section className="card glass-card" style={{ padding: '2rem' }}>
        <h3 style={{ marginBottom: '1.5rem' }}>Journal des Transactions</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Catégorie</th>
              <th>Description</th>
              <th>Projet Affecté</th>
              <th>Statut</th>
              <th style={{ textAlign: 'right' }}>Montant</th>
            </tr>
          </thead>
          <tbody>
            {records.map(record => (
              <tr key={record.id}>
                <td>{new Date(record.issuedAt).toLocaleDateString('fr-FR')}</td>
                <td>
                  <span style={{ 
                    padding: '0.2rem 0.6rem', 
                    borderRadius: '1rem', 
                    fontSize: '0.75rem', 
                    fontWeight: 600,
                    background: `${CATEGORY_COLORS[record.expenseCategory as ExpenseCategory || 'OPERATIONNEL']}15`,
                    color: CATEGORY_COLORS[record.expenseCategory as ExpenseCategory || 'OPERATIONNEL']
                  }}>
                    {CATEGORY_LABELS[record.expenseCategory as ExpenseCategory || 'OPERATIONNEL']}
                  </span>
                </td>
                <td>{record.lines?.[0]?.description || 'Dépense Générale'}</td>
                <td style={{ color: 'var(--text-muted)' }}>{record.project?.name || '—'}</td>
                <td><span className={`status status-${record.status.toLowerCase()}`}>{record.status}</span></td>
                <td style={{ textAlign: 'right', fontWeight: 600, color: '#ef4444' }}>
                  − {Number(record.amountTTC).toLocaleString()} {record.currency}
                </td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Aucune dépense enregistrée.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {/* Add Modal */}
      {showModal && (
        <div className="mobile-backdrop" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setShowModal(false)}>
          <div className="card glass-card" style={{ width: '100%', maxWidth: '520px', padding: '1.5rem' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0 }}>Saisir une nouvelle charge</h3>
              <button className="ghost" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            
            <form onSubmit={handleSave} className="form-grid">
              <label>
                Montant TTC *
                <input type="number" step="0.01" min="0" required value={amount} onChange={e => setAmount(Number(e.target.value))} placeholder="Ex: 1500" />
              </label>
              
              <label>
                Devise
                <select value={currency} onChange={e => setCurrency(e.target.value)}>
                  <option value="USD">USD</option>
                  <option value="GNF">GNF</option>
                </select>
              </label>

              <label style={{ gridColumn: '1 / -1' }}>
                Catégorie Analytique *
                <select required value={category} onChange={e => setCategory(e.target.value as ExpenseCategory)}>
                  {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </label>

              <label style={{ gridColumn: '1 / -1' }}>
                Projet Lié (Optionnel)
                <select value={projectId} onChange={e => setProjectId(e.target.value)}>
                  <option value="">Aucun (Charge Générale d'Exploitation)</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </label>

              <label style={{ gridColumn: '1 / -1' }}>
                Description / Justificatif *
                <input required value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: Abonnement AWS Juin, Loyer, ..." />
              </label>

              <label style={{ gridColumn: '1 / -1' }}>
                Statut de Paiement
                <select value={status} onChange={e => setStatus(e.target.value as any)}>
                  <option value="PAID">Payé</option>
                  <option value="PENDING">À payer (En attente)</option>
                </select>
              </label>

              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="submit" className="btn-primary" disabled={isSaving}>
                  {isSaving ? 'Enregistrement...' : 'Enregistrer la dépense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
