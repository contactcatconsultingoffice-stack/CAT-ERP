import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { KpiSkeleton } from '../../components/Skeleton';
import { AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { AnimatedNumber } from '../../components/AnimatedNumber';

type FinancialRecord = {
  id: string;
  kind: 'QUOTE' | 'INVOICE';
  amountTTC: string;
  currency: string;
  status: 'READY_TO_SEND' | 'SENT' | 'PENDING' | 'PAID' | 'LATE';
  issuedAt: string;
};

const STATUS_COLORS = {
  PLANNING: '#94a3b8',
  IN_PROGRESS: '#6366f1',
  COMPLETED: '#22c55e',
  ON_HOLD: '#f59e0b'
};

const STATUS_LABELS: Record<string, string> = {
  PLANNING: 'Planification',
  IN_PROGRESS: 'En cours',
  COMPLETED: 'Terminé',
  ON_HOLD: 'En pause'
};

export function DashboardPage() {
  const [rates, setRates] = useState<Record<string, number>>({ USD: 1 });

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const res = await api.get<{ rates: Record<string, number> }>('/rates');
        if (res && res.rates) {
          setRates(res.rates);
        }
      } catch (err) {
        console.warn("Internal exchange rates fetch failed", err);
      }
    };
    fetchRates();
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: async () => {
      const results = await Promise.allSettled([
        api.get<any>('/dashboard/summary'),
        api.get<any>('/financial?limit=1000&status=PAID&kind=INVOICE'),
      ]);

      const [sumRes, finRes] = results;

      return {
        summary: sumRes.status === 'fulfilled' ? sumRes.value : null,
        financial: finRes.status === 'fulfilled' ? finRes.value.data || finRes.value : [],
        hasErrors: results.some(r => r.status === 'rejected')
      };
    },
    staleTime: 120000 
  });

  const {
    summary,
    financial = [],
    hasErrors = false
  } = data || {};

  const counts = summary?.counts || {};
  const statusCounts = counts.status || {};
  const countsByStatus = statusCounts;

  const toUSD = (amount: number, curr: string) => {
    if (curr === 'USD' || !rates[curr]) return amount;
    return amount / rates[curr];
  };

  const processRevenueData = () => {
    const dataMap: Record<string, number> = {};
    const relevant = financial.filter((f: FinancialRecord) => f.kind === 'INVOICE' && f.status === 'PAID');
    relevant.forEach((f: FinancialRecord) => {
      if (!f.issuedAt) return;
      const date = new Date(f.issuedAt);
      const monthStr = date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
      dataMap[monthStr] = (dataMap[monthStr] || 0) + toUSD(Number(f.amountTTC || 0), f.currency || 'USD');
    });
    return Object.entries(dataMap)
      .map(([name, total]) => ({ name, total }))
      .reverse(); 
  };

  const processStatusData = () => {
    return Object.entries(statusCounts).map(([name, value]) => ({ 
      name: STATUS_LABELS[name] || name, 
      value: value as number,
      color: STATUS_COLORS[name as keyof typeof STATUS_COLORS] 
    })).filter(d => d.value > 0);
  };

  const statusData = processStatusData();
  const revenueData = processRevenueData();

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1>Dashboard</h1>
        <p>Vue d'ensemble rapide de l'activité CAT Consulting.</p>
      </header>

      {hasErrors && (
        <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '0.75rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          <AlertCircle size={20} />
          Certaines données n'ont pas pu être chargées - Connexion à un service défaillante.
        </div>
      )}

      <motion.section 
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {isLoading ? (
          <KpiSkeleton count={4} />
        ) : (
          <>
            <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '1.5rem' }}>
              <motion.div variants={itemVariants} className="kpi" style={{ borderLeftColor: STATUS_COLORS.PLANNING }}>
                <h3>Planifiés</h3>
                <p><AnimatedNumber value={countsByStatus.PLANNING || 0} /></p>
              </motion.div>
              <motion.div variants={itemVariants} className="kpi" style={{ borderLeftColor: STATUS_COLORS.IN_PROGRESS }}>
                <h3>En cours</h3>
                <p><AnimatedNumber value={countsByStatus.IN_PROGRESS || 0} /></p>
              </motion.div>
              <motion.div variants={itemVariants} className="kpi" style={{ borderLeftColor: STATUS_COLORS.ON_HOLD }}>
                <h3>En pause</h3>
                <p><AnimatedNumber value={countsByStatus.ON_HOLD || 0} /></p>
              </motion.div>
              <motion.div variants={itemVariants} className="kpi" style={{ borderLeftColor: STATUS_COLORS.COMPLETED }}>
                <h3>Terminés</h3>
                <p><AnimatedNumber value={countsByStatus.COMPLETED || 0} /></p>
              </motion.div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 1.2fr) minmax(260px, 1fr)', gap: '1.5rem', alignItems: 'stretch' }}>
              <motion.div variants={itemVariants} className="card" style={{ padding: '1.5rem' }}>
                <h3 style={{ marginBottom: '1.25rem', color: 'var(--text-primary)', fontWeight: 600 }}>Statistiques Globales</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem' }}>
                  <div style={{ padding: '1rem', background: 'var(--bg-main)', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Nombre de Projets</span>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '1.25rem' }}><AnimatedNumber value={counts.projects || 0} /></div>
                  </div>
                  <div style={{ padding: '1rem', background: 'var(--bg-main)', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Clients actifs</span>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '1.25rem' }}><AnimatedNumber value={counts.clients || 0} /></div>
                  </div>
                  <div style={{ padding: '1rem', background: 'var(--bg-main)', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Collaborateurs</span>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '1.25rem' }}><AnimatedNumber value={counts.collaborators || 0} /></div>
                  </div>
                  <div style={{ padding: '1rem', background: 'var(--bg-main)', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Partenaires</span>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '1.25rem' }}><AnimatedNumber value={counts.partners || 0} /></div>
                  </div>
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="card" style={{ padding: '1.5rem' }}>
                <h3 style={{ marginBottom: '1.25rem', color: 'var(--text-primary)', fontWeight: 600 }}>Répartition par Statut</h3>
                {statusData.length === 0 ? (
                  <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                    Aucun projet actif.
                  </div>
                ) : (
                  <div style={{ height: 320 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={6}
                          dataKey="value"
                        >
                          {statusData.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{background: 'var(--bg-sidebar)', borderRadius: '0.5rem', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-main)', color: 'var(--text-primary)'}} />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{color: 'var(--text-secondary)'}} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </motion.div>
            </div>
          </>
        )}
      </motion.section>
    </div>
  );
}
