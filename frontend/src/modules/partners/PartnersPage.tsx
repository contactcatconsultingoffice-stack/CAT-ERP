import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../auth/useAuth';
import { Edit2, Trash2, Check, X, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { ExportButtons } from '../../components/ExportButtons';
import { useToast } from '../../components/Toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { TableSkeleton } from '../../components/Skeleton';

type Partner = {
  id: string;
  name: string;
  contact?: string | null;
  email?: string | null;
  phone?: string | null;
};

type PaginatedPartners = {
  data: Partner[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
};

export function PartnersPage() {
  const { role } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Add form
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editContact, setEditContact] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page when search changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const { data, isLoading } = useQuery({
    queryKey: ['partners', page, debouncedSearch],
    queryFn: () => api.get<PaginatedPartners>(`/partners?page=${page}&limit=${limit}${debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : ''}`)
  });

  const partnersList = data?.data || [];

  const reloadData = () => {
    queryClient.invalidateQueries({ queryKey: ['partners'] });
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    try {
      await api.post<Partner>('/partners', { name, contact, email, phone });
      showToast('Partenaire ajouté !', 'success');
      setName(''); setContact(''); setEmail(''); setPhone('');
      reloadData();
    } catch {
      showToast('Erreur lors de l\'ajout du partenaire.', 'error');
    }
  };

  const startEdit = (p: Partner) => {
    setEditingId(p.id);
    setEditName(p.name);
    setEditContact(p.contact || '');
    setEditEmail(p.email || '');
    setEditPhone(p.phone || '');
  };

  const cancelEdit = () => setEditingId(null);

  const handleSaveEdit = async (id: string) => {
    try {
      await api.put(`/partners/${id}`, { name: editName, contact: editContact, email: editEmail, phone: editPhone });
      showToast('Partenaire mis à jour !', 'success');
      setEditingId(null);
      reloadData();
    } catch {
      showToast('Erreur lors de la mise à jour.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer ce partenaire ?')) return;
    try {
      await api.delete(`/partners/${id}`);
      showToast('Partenaire supprimé.', 'success');
      reloadData();
    } catch {
      showToast('Erreur lors de la suppression.', 'error');
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1>Partenaires</h1>
        <p>Gérez vos relations avec vos partenaires business.</p>
      </header>

      <section className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2>Liste</h2>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <ExportButtons 
              data={partnersList.map(p => ({ 
                ID: p.id, 
                Entreprise: p.name, 
                Interlocuteur: p.contact || '', 
                Email: p.email || '',
                Téléphone: p.phone || '' 
              }))}
              filename="partenaires"
            />
            <div className="search-box">
              <input
                type="text"
                placeholder="Rechercher un partenaire..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="table-responsive">
          <table className="lines-table">
            <thead>
              <tr>
                <th>Nom de l'entreprise</th>
                <th>Interlocuteur</th>
                <th>Email</th>
                <th>Téléphone</th>
                {role === 'ADMIN' && <th style={{ width: 100 }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} style={{ padding: 0 }}>
                    <TableSkeleton rows={8} cols={5} />
                  </td>
                </tr>
              ) : partnersList.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem 1rem' }}>
                    Aucun partenaire trouvé.
                  </td>
                </tr>
              ) : partnersList.map(p => (
                <React.Fragment key={p.id}>
                  <tr>
                    <td>{p.name}</td>
                    <td>{p.contact || '—'}</td>
                    <td>{p.email || '—'}</td>
                    <td>{p.phone || '—'}</td>
                    {role === 'ADMIN' && (
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button
                            type="button"
                            className="ghost"
                            onClick={() => editingId === p.id ? cancelEdit() : startEdit(p)}
                            style={{ padding: '0.25rem 0.5rem' }}
                            title="Modifier"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            type="button"
                            className="ghost"
                            onClick={() => handleDelete(p.id)}
                            style={{ padding: '0.25rem 0.5rem', color: '#f87171' }}
                            title="Supprimer"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                  {editingId === p.id && (
                    <tr key={`edit-${p.id}`}>
                      <td colSpan={5} style={{ padding: '0' }}>
                        <div style={{
                          background: 'var(--bg-main)',
                          border: '1px solid var(--accent-primary)',
                          borderRadius: '0.75rem',
                          padding: '1rem 1.25rem',
                          margin: '0.25rem 0',
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))',
                          gap: '1rem',
                          alignItems: 'end'
                        }}>
                          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            Nom de l'entreprise
                            <input value={editName} onChange={e => setEditName(e.target.value)} style={{ padding: '0.5rem' }} />
                          </label>
                          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            Interlocuteur
                            <input value={editContact} onChange={e => setEditContact(e.target.value)} style={{ padding: '0.5rem' }} />
                          </label>
                          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            Email
                            <input value={editEmail} type="email" onChange={e => setEditEmail(e.target.value)} style={{ padding: '0.5rem' }} />
                          </label>
                          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            Téléphone
                            <input value={editPhone} onChange={e => setEditPhone(e.target.value)} style={{ padding: '0.5rem' }} />
                          </label>
                          <div style={{ display: 'flex', gap: '0.5rem', paddingBottom: '0.1rem' }}>
                            <button type="button" className="btn-primary" onClick={() => handleSaveEdit(p.id)} style={{ padding: '0.5rem 0.9rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <Check size={14} /> Sauvegarder
                            </button>
                            <button type="button" className="ghost" onClick={cancelEdit} style={{ padding: '0.5rem', display: 'flex', alignItems: 'center' }}>
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
          
          {data && data.totalPages > 1 && (
            <div style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Total: {data.totalCount} partenaires
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

      {role === 'ADMIN' && (
        <section className="card">
          <h2>Ajouter un partenaire</h2>
          <form onSubmit={handleAdd} className="form-grid">
            <label>Nom de l'entreprise <input value={name} onChange={e => setName(e.target.value)} required /></label>
            <label>Interlocuteur <input value={contact} onChange={e => setContact(e.target.value)} /></label>
            <label>Email <input value={email} type="email" onChange={e => setEmail(e.target.value)} /></label>
            <label>Téléphone <input value={phone} onChange={e => setPhone(e.target.value)} /></label>
            <div><button type="submit" className="btn-primary">Enregistrer</button></div>
          </form>
        </section>
      )}
    </div>
  );
}
