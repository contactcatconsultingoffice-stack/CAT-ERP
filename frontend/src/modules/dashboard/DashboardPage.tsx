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

type Mission = { hours: number };
type Client = { id: string };
type Project = { status: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD' };
type Partner = { id: string };
type Collaborator = { id: string };

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
        const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const data = await res.json();
        if (data && data.rates) {
          setRates(data.rates);
        }
      } catch (err) {
        console.warn("Exchange rates fetch failed", err);
      }
    };
    fetchRates();
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['dashboardData'],
    queryFn: async () => {
      // Use Promise.allSettled so that if one API fails, we still render the rest
      const results = await Promise.allSettled([
        api.get<any>('/financial?limit=1000'), // Or summary endpoint
        api.get<any>('/missions?limit=1000'),
        api.get<any>('/projects?limit=1000'),
        api.get<any>('/clients?limit=1000'),
        api.get<any>('/partners?limit=1000'),
        api.get<any>('/collaborators?limit=1000')
      ]);

      const [finRes, misRes, projRes, cliRes, parRes, colRes] = results;

      return {
        financial: finRes.status === 'fulfilled' ? finRes.value.data || finRes.value : [],
        missions: misRes.status === 'fulfilled' ? misRes.value.data || misRes.value : [],
        projects: projRes.status === 'fulfilled' ? projRes.value.data || projRes.value : [],
        clients: cliRes.status === 'fulfilled' ? cliRes.value.data || cliRes.value : [],
        partners: parRes.status === 'fulfilled' ? parRes.value.data || parRes.value : [],
        collaborators: colRes.status === 'fulfilled' ? colRes.value.data || colRes.value : [],
        hasErrors: results.some(r => r.status === 'rejected')
      };
    },
    staleTime: 120000 // Cache for 2 minutes
  });

  const {
    financial = [],
    missions = [],
    projects = [],
    clients = [],
    partners = [],
    collaborators = [],
    hasErrors = false
  } = data || {};

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
    const counts: Record<string, number> = { PLANNING: 0, IN_PROGRESS: 0, ON_HOLD: 0, COMPLETED: 0 };
    projects.forEach((p: Project) => {
      counts[p.status] = (counts[p.status] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ 
      name: STATUS_LABELS[name] || name, 
      value,
      color: STATUS_COLORS[name as keyof typeof STATUS_COLORS] 
    })).filter(d => d.value > 0);
  };

  const revenueData = processRevenueData();
  const statusData = processStatusData();
  
  const countsByStatus = projects.reduce((acc: any, p: Project) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

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
        <p>Vue d&apos;ensemble rapide de l&apos;activité CAT Consulting.</p>
      </header>

      {hasErrors && (
        <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '0.75rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          <AlertCircle size={20} />
          Certaines données n'ont pas pu être chargées - Connexion à un service défaillante.
        </div>
      )}

      <motion.section 
        className="card"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {isLoading ? (
          <KpiSkeleton count={4} />
        ) : (
          <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
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
        )}
        
        {!isLoading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))', gap: '2rem', marginTop: '2rem' }}>
            <motion.div variants={itemVariants} className="card" style={{ padding: '1.5rem' }}>
              <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)', fontWeight: 600 }}>Revenus ($ USD) par Mois</h3>
              
              {revenueData.length === 0 ? (
                <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                  Aucune facture payée.
                </div>
              ) : (
                <div style={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                      <XAxis dataKey="name" tick={{fill: 'var(--text-secondary)', fontSize: 12}} axisLine={false} tickLine={false} />
                      <YAxis tick={{fill: 'var(--text-secondary)', fontSize: 12}} axisLine={false} tickLine={false} width={80} tickFormatter={(val) => `$${val}`} />
                      <Tooltip cursor={{fill: 'var(--bg-main)'}} formatter={(value: any) => [`$${Number(value || 0).toFixed(0)}`, 'Revenu encaissé']} contentStyle={{background: 'var(--bg-sidebar)', borderRadius: '0.5rem', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-main)', color: 'var(--text-primary)'}} itemStyle={{color: 'var(--text-primary)'}} />
                      <Bar dataKey="total" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </motion.div>
            
            <motion.div variants={itemVariants} className="card" style={{ padding: '1.5rem' }}>
              <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)', fontWeight: 600 }}>Statistiques Globales</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'var(--bg-main)', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Nombre de Projets</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}><AnimatedNumber value={projects.length} /></span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'var(--bg-main)', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Partenaires</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}><AnimatedNumber value={partners.length} /></span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'var(--bg-main)', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Collaborateurs</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}><AnimatedNumber value={collaborators.length} /></span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'var(--bg-main)', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Clients</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}><AnimatedNumber value={clients.length} /></span>
                </div>
              </div>
            </motion.div>
            <motion.div variants={itemVariants} className="card" style={{ padding: '1.5rem' }}>
              <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)', fontWeight: 600 }}>Répartition par Statut</h3>
              
              {statusData.length === 0 ? (
                <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                  Aucun projet actif.
                </div>
              ) : (
                <div style={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {statusData.map((entry, index) => (
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
        )}
      </motion.section>
    </div>
  );
}
