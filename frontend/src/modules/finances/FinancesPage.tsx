import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area 
} from 'recharts';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight,
  Filter,
  Download
} from 'lucide-react';
import { motion } from 'framer-motion';
import { AnimatedNumber } from '../../components/AnimatedNumber';
import { KpiSkeleton } from '../../components/Skeleton';

type FinancialRecord = {
  id: string;
  kind: 'QUOTE' | 'INVOICE';
  amountTTC: string;
  currency: string;
  status: 'READY_TO_SEND' | 'SENT' | 'PENDING' | 'PAID' | 'LATE';
  issuedAt: string;
  project?: { type: string };
};

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

export function FinancesPage() {
  const [timeRange, setTimeRange] = useState('ALL');

  const { data: financialData, isLoading } = useQuery({
    queryKey: ['financesSummary', timeRange],
    queryFn: async () => {
      const res = await api.get<FinancialRecord[]>('/financial?limit=2000');
      return Array.isArray(res) ? res : (res as any).data || [];
    }
  });

  const { data: rates } = useQuery({
    queryKey: ['rates'],
    queryFn: async () => {
      const res = await api.get<{ rates: Record<string, number> }>('/rates');
      return res.rates || { USD: 1, TND: 3.1 };
    }
  });

  const toUSD = (amount: number, curr: string) => {
    if (!rates || curr === 'USD') return amount;
    return amount / (rates[curr] || 1);
  };

  const processRevenueByMonth = () => {
    const dataMap: Record<string, number> = {};
    const invoices = (financialData as FinancialRecord[])?.filter((f: FinancialRecord) => f.kind === 'INVOICE' && f.status === 'PAID') || [];
    
    invoices.forEach((f: FinancialRecord) => {
      if (!f.issuedAt) return;
      const date = new Date(f.issuedAt);
      const monthStr = date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
      dataMap[monthStr] = (dataMap[monthStr] || 0) + toUSD(Number(f.amountTTC), f.currency);
    });

    return Object.entries(dataMap).map(([name, total]) => ({ name, total })).reverse();
  };

  const processRevenueByType = () => {
    const typeMap: Record<string, number> = {};
    const invoices = (financialData as FinancialRecord[])?.filter((f: FinancialRecord) => f.kind === 'INVOICE' && f.status === 'PAID') || [];
    
    invoices.forEach((f: FinancialRecord) => {
      const type = f.project?.type || 'AUTRE';
      typeMap[type] = (typeMap[type] || 0) + toUSD(Number(f.amountTTC), f.currency);
    });

    return Object.entries(typeMap).map(([name, value]) => ({ name, value }));
  };

  const processCashflow = () => {
    const dataMap: Record<string, { in: number, out: number }> = {};
    const invoices = (financialData as FinancialRecord[])?.filter((f: FinancialRecord) => f.kind === 'INVOICE') || [];
    
    invoices.forEach((f: FinancialRecord) => {
      if (!f.issuedAt) return;
      const date = new Date(f.issuedAt);
      const monthStr = date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
      
      if (!dataMap[monthStr]) dataMap[monthStr] = { in: 0, out: 0 };
      
      if (f.status === 'PAID') {
        dataMap[monthStr].in += toUSD(Number(f.amountTTC), f.currency);
      }
      // dummy out value
      dataMap[monthStr].out = dataMap[monthStr].in * 0.35;
    });

    return Object.entries(dataMap).map(([name, vals]) => ({ name, ...vals })).reverse();
  };

  const revenueByMonth = processRevenueByMonth();
  const revenueByType = processRevenueByType();
  const cashflowData = processCashflow();

  const totalRevenue = revenueByMonth.reduce((acc, curr) => acc + curr.total, 0);
  const pendingRevenue = (financialData as FinancialRecord[])?.filter((f: FinancialRecord) => f.kind === 'INVOICE' && f.status !== 'PAID')
    .reduce((acc: number, curr: FinancialRecord) => acc + toUSD(Number(curr.amountTTC), curr.currency), 0) || 0;

  if (isLoading) return <div className="page"><KpiSkeleton count={4} /></div>;

  return (
    <div className="page">
      <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Analyse Financière</h1>
          <p>Suivi des flux, revenus et performances de CAT Consulting.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="ghost" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Download size={18} /> Exporter Rapport
          </button>
        </div>
      </header>

      <section className="kpi-grid" style={{ marginBottom: '2rem' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="kpi card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Revenu Total (Encaissé)</span>
            <div style={{ padding: '0.4rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '0.5rem' }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <p style={{ fontSize: '1.75rem', fontWeight: 700 }}>$<AnimatedNumber value={totalRevenue} /></p>
          <span style={{ fontSize: '0.8rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
            <ArrowUpRight size={14} /> +12.5% vs mois dernier
          </span>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="kpi card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Encours Clients</span>
            <div style={{ padding: '0.4rem', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', borderRadius: '0.5rem' }}>
              <ArrowUpRight size={18} />
            </div>
          </div>
          <p style={{ fontSize: '1.75rem', fontWeight: 700 }}>$<AnimatedNumber value={pendingRevenue} /></p>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Factures en attente de paiement</span>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="kpi card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Marge Opérationnelle</span>
            <div style={{ padding: '0.4rem', background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', borderRadius: '0.5rem' }}>
              <DollarSign size={18} />
            </div>
          </div>
          <p style={{ fontSize: '1.75rem', fontWeight: 700 }}>65%</p>
          <span style={{ fontSize: '0.8rem', color: '#10b981' }}>Optimisé ce trimestre</span>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="kpi card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Dépenses Estimées</span>
            <div style={{ padding: '0.4rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '0.5rem' }}>
              <TrendingDown size={18} />
            </div>
          </div>
          <p style={{ fontSize: '1.75rem', fontWeight: 700 }}>$<AnimatedNumber value={totalRevenue * 0.35} /></p>
          <span style={{ fontSize: '0.8rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
            <ArrowDownRight size={14} /> Stable
          </span>
        </motion.div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '2rem' }}>
        <motion.section initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="card" style={{ padding: '2rem' }}>
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={20} color="var(--accent-primary)" /> Flux de Trésorerie (Mensuel)
          </h3>
          <div style={{ height: 350 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cashflowData}>
                <defs>
                  <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="name" tick={{fill: 'var(--text-secondary)', fontSize: 12}} axisLine={false} tickLine={false} />
                <YAxis tick={{fill: 'var(--text-secondary)', fontSize: 12}} axisLine={false} tickLine={false} tickFormatter={(val) => `$${val}`} />
                <Tooltip 
                  contentStyle={{background: 'var(--bg-sidebar)', borderRadius: '0.75rem', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-main)'}}
                  itemStyle={{fontSize: '0.85rem'}}
                  formatter={(val: any) => [`$${Number(val || 0).toLocaleString()}`, '']}
                />
                <Area type="monotone" dataKey="in" name="Entrées" stroke="#10b981" fillOpacity={1} fill="url(#colorIn)" strokeWidth={3} />
                <Area type="monotone" dataKey="out" name="Sorties" stroke="#ef4444" fillOpacity={1} fill="url(#colorOut)" strokeWidth={3} />
                <Legend verticalAlign="top" align="right" height={36}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="card" style={{ padding: '2rem' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Revenus par Catégorie de Projet</h3>
          <div style={{ height: 350, display: 'flex', alignItems: 'center' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={revenueByType}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {revenueByType.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{background: 'var(--bg-sidebar)', borderRadius: '0.75rem', border: '1px solid var(--border-color)'}}
                  formatter={(val: any) => [`$${Number(val || 0).toLocaleString()}`, '']}
                />
                <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card" style={{ padding: '2rem', gridColumn: '1 / -1' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Historique de Revenus Mensuels ($ USD)</h3>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueByMonth}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="name" tick={{fill: 'var(--text-secondary)', fontSize: 12}} axisLine={false} tickLine={false} />
                <YAxis tick={{fill: 'var(--text-secondary)', fontSize: 12}} axisLine={false} tickLine={false} tickFormatter={(val) => `$${val}`} />
                <Tooltip 
                  cursor={{fill: 'var(--bg-main)'}}
                  contentStyle={{background: 'var(--bg-sidebar)', borderRadius: '0.75rem', border: '1px solid var(--border-color)'}}
                  formatter={(val: any) => [`$${Number(val || 0).toLocaleString()}`, 'Revenu']}
                />
                <Bar dataKey="total" name="Revenu" fill="var(--accent-primary)" radius={[6, 6, 0, 0]} barSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.section>
      </div>

      <section className="card glass-card" style={{ marginTop: '2rem', padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3>Dernières Transactions Financières</h3>
          <button className="btn-primary" style={{ fontSize: '0.85rem' }}>+ Nouvelle Transaction Manuel</button>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Description</th>
              <th>Catégorie</th>
              <th>Montant</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {(financialData as FinancialRecord[])?.slice(0, 10).map((f: FinancialRecord) => (
              <tr key={f.id}>
                <td>{new Date(f.issuedAt).toLocaleDateString()}</td>
                <td><span className={f.kind === 'INVOICE' ? 'status status-completed' : 'status status-planning'}>{f.kind}</span></td>
                <td>Paiement Client - {f.project?.type || 'Projet'}</td>
                <td>Revenu Prestation</td>
                <td style={{ fontWeight: 600 }}>{f.amountTTC} {f.currency}</td>
                <td><span className={"status status-" + f.status.toLowerCase()}>{f.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
