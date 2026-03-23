import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

type FinancialRecord = {
  id: string;
  kind: 'QUOTE' | 'INVOICE';
  amountTTC: string;
  currency: string;
  status: 'READY_TO_SEND' | 'SENT' | 'PENDING' | 'PAID' | 'LATE';
  issuedAt: string;
};

type Mission = {
  id: string;
  hours: number;
  project?: { name: string };
};

type Client = {
  id: string;
};

type Project = {
  id: string;
  status: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD';
};

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

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Basse',
  MEDIUM: 'Moyenne',
  HIGH: 'Haute'
};

export function DashboardPage() {
  const [financial, setFinancial] = useState<FinancialRecord[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [rates, setRates] = useState<Record<string, number>>({ USD: 1 });

  useEffect(() => {
    const load = async () => {
      try {
        const [fin, mis, proj, cls, parts, colls] = await Promise.all([
          api.get<FinancialRecord[]>('/financial'),
          api.get<Mission[]>('/missions'),
          api.get<Project[]>('/projects'),
          api.get<Client[]>('/clients'),
          api.get<Partner[]>('/partners'),
          api.get<Collaborator[]>('/collaborators')
        ]);
        setFinancial(fin);
        setMissions(mis);
        setProjects(proj);
        setClients(cls);
        setPartners(parts);
        setCollaborators(colls);

        try {
          const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
          const data = await res.json();
          if (data && data.rates) {
            setRates(data.rates);
          }
        } catch (err) {
          console.warn("Exchange rates fetch failed");
        }
      } catch {
        // ignore errors
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const toUSD = (amount: number, curr: string) => {
    if (curr === 'USD' || !rates[curr]) return amount;
    return amount / rates[curr];
  };

  // Only PAID invoices count toward revenue
  const revenueEncaissé = financial
    .filter(f => f.kind === 'INVOICE' && f.status === 'PAID')
    .reduce((sum, f) => sum + toUSD(Number(f.amountTTC || 0), f.currency || 'USD'), 0);
    
  const totalHours = missions.reduce((sum, m) => sum + Number(m.hours || 0), 0);

  const processRevenueData = () => {
    const dataMap: Record<string, number> = {};
    const relevant = financial.filter(f => f.kind === 'INVOICE' && f.status === 'PAID');
    relevant.forEach(f => {
      if (!f.issuedAt) return;
      const date = new Date(f.issuedAt);
      const monthStr = date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
      dataMap[monthStr] = (dataMap[monthStr] || 0) + toUSD(Number(f.amountTTC || 0), f.currency || 'USD');
    });
    return Object.entries(dataMap)
      .map(([name, total]) => ({ name, total }))
      .reverse(); // Assuming descending order from API, we want chronological left to right
  };

  // Removed processPriorityData

  const processStatusData = () => {
    const counts: Record<string, number> = { PLANNING: 0, IN_PROGRESS: 0, ON_HOLD: 0, COMPLETED: 0 };
    projects.forEach(p => {
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
  
  const countsByStatus = projects.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="page">
      <header className="page-header">
        <h1>Dashboard</h1>
        <p>Vue d&apos;ensemble rapide de l&apos;activité CAT Consulting.</p>
      </header>

      <section className="card">
        {loading ? (
          <p>Chargement des indicateurs…</p>
        ) : (
          <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <div className="kpi" style={{ borderLeftColor: STATUS_COLORS.PLANNING }}>
              <h3>Planifiés</h3>
              <p>{countsByStatus.PLANNING || 0}</p>
            </div>
            <div className="kpi" style={{ borderLeftColor: STATUS_COLORS.IN_PROGRESS }}>
              <h3>En cours</h3>
              <p>{countsByStatus.IN_PROGRESS || 0}</p>
            </div>
            <div className="kpi" style={{ borderLeftColor: STATUS_COLORS.ON_HOLD }}>
              <h3>En pause</h3>
              <p>{countsByStatus.ON_HOLD || 0}</p>
            </div>
            <div className="kpi" style={{ borderLeftColor: STATUS_COLORS.COMPLETED }}>
              <h3>Terminés</h3>
              <p>{countsByStatus.COMPLETED || 0}</p>
            </div>
          </div>
        )}
        
        {!loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))', gap: '2rem', marginTop: '2rem' }}>
            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)', fontWeight: 600 }}>Revenus ($ USD) par Mois</h3>
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
            </div>
            
            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)', fontWeight: 600 }}>Statistiques Globales</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'var(--bg-main)', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Nombre de Projets</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{projects.length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'var(--bg-main)', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Partenaires</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{partners.length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'var(--bg-main)', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Collaborateurs</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{collaborators.length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'var(--bg-main)', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Clients</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{clients.length}</span>
                </div>
              </div>
            </div>
            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)', fontWeight: 600 }}>Répartition par Statut</h3>
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
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
