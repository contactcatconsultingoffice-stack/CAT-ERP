import { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Activity, Clock, User, Tag, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '../../components/Toast';
import { TableSkeleton } from '../../components/Skeleton';

type AuditLog = {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  details: string | null;
  createdAt: string;
  user: {
    name: string | null;
    email: string;
  };
};

type PaginatedLogs = {
  data: AuditLog[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
};

export function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 100;
  const { showToast } = useToast();

  useEffect(() => {
    fetchLogs();
  }, [page]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get<PaginatedLogs>(`/admin/logs?page=${page}&limit=${limit}`);
      setLogs(res.data || []);
      setTotalPages(res.totalPages || 1);
      setTotalCount(res.totalCount || 0);
    } catch (err) {
      showToast("Erreur lors de la récupération des logs", "error");
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE': return '#22c55e';
      case 'UPDATE': return '#3b82f6';
      case 'DELETE': return '#ef4444';
      case 'LOGIN': return '#8b5cf6';
      case 'UPDATE_PASSWORD': return '#f59e0b';
      default: return '#94a3b8';
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(79, 70, 229, 0.1)', padding: '0.75rem', borderRadius: '1rem', color: '#818cf8' }}>
            <Activity size={32} />
          </div>
          <div>
            <h1>Journal d'Activité</h1>
            <p>Historique complet des actions effectuées sur la plateforme.</p>
          </div>
        </div>
      </header>

      <div className="card glass" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="lines-table">
            <thead>
              <tr>
                <th style={{ paddingLeft: '1.5rem' }}>Utilisateur</th>
                <th>Action</th>
                <th>Entité</th>
                <th>Détails</th>
                <th>Date &amp; Heure</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: 0 }}>
                    <TableSkeleton rows={10} cols={5} />
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                    Aucune activité enregistrée pour le moment.
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} style={{ transition: 'background 0.2s' }}>
                    <td style={{ paddingLeft: '1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <User size={16} color="#94a3b8" />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{log.user.name || 'Admin'}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{log.user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span 
                        style={{ 
                          padding: '0.2rem 0.6rem', 
                          borderRadius: '0.5rem', 
                          fontSize: '0.7rem', 
                          fontWeight: 600,
                          background: `${getActionColor(log.action)}20`,
                          color: getActionColor(log.action),
                          border: `1px solid ${getActionColor(log.action)}40`
                        }}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                        <Tag size={14} color="#64748b" />
                        <span>{log.entity}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: '#cbd5e1' }}>
                        <Info size={14} color="#64748b" />
                        <span>{log.details || '-'}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8', fontSize: '0.8rem' }}>
                        <Clock size={14} />
                        {format(new Date(log.createdAt), 'dd MMMM yyyy HH:mm', { locale: fr })}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Total: {totalCount} entrées
              </span>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button className="ghost" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))} style={{ padding: '0.3rem' }}>
                  <ChevronLeft size={16} />
                </button>
                <span style={{ fontSize: '0.85rem' }}>Page {page} / {totalPages}</span>
                <button className="ghost" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} style={{ padding: '0.3rem' }}>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
