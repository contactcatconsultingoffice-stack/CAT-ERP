import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../auth/useAuth';
import { Edit2, Trash2, Check, X, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { ExportButtons } from '../../components/ExportButtons';
import { useToast } from '../../components/Toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { TableSkeleton } from '../../components/Skeleton';

type Client = {
  id: string;
  name: string;
  contact?: string | null;
  email?: string | null;
  phone?: string | null;
};

type PaginatedClients = {
  data: Client[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
};

export function ClientsPage() {
  const { user } = useAuth();
  const role = user?.role;
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Form states for Add
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
  const [isAdding, setIsAdding] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page to 1 when search changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const { data, isLoading } = useQuery({
    queryKey: ['clients', page, debouncedSearch],
    queryFn: () => api.get<PaginatedClients>(`/clients?page=${page}&limit=${limit}${debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : ''}`)
  });

  const clientsList = data?.data || [];

  const reloadData = () => {
    queryClient.invalidateQueries({ queryKey: ['clients'] });
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setIsAdding(true);
    try {
      await api.post<Client>('/clients', { name, contact, email, phone });
      showToast('Client ajouté avec succès !', 'success');
      setName('');
      setContact('');
      setEmail('');
      setPhone('');
      reloadData();
    } catch (err) {
      showToast('Erreur lors de l’ajout du client.', 'error');
    } finally {
      setIsAdding(false);
    }
  };

  const startEdit = (c: Client) => {
    setEditingId(c.id);
    setEditName(c.name);
    setEditContact(c.contact || '');
    setEditEmail(c.email || '');
    setEditPhone(c.phone || '');
  };
  
  const cancelEdit = () => setEditingId(null);
  
  const handleSaveEdit = async (id: string) => {
    setIsUpdating(true);
    try {
      await api.put(`/clients/${id}`, { 
        name: editName, 
        contact: editContact, 
        email: editEmail, 
        phone: editPhone 
      });
      showToast('Client mis à jour !', 'success');
      setEditingId(null);
      reloadData();
    } catch (err) {
      showToast('Erreur lors de la mise à jour.', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Voulez-vous vraiment supprimer ce client ?")) return;
    try {
      await api.delete(`/clients/${id}`);
      showToast('Client supprimé.', 'success');
      reloadData();
    } catch (err) {
      showToast('Erreur lors de la suppression.', 'error');
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1>Clients</h1>
        <p>Annuaire des clients pour vos projets.</p>
      </header>

      <section className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2>Liste</h2>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button 
              className="ghost" 
              onClick={async () => {
                try {
                  const blob = await api.getBlob('/clients/export/pdf');
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'annuaire-clients.pdf';
                  a.click();
                  window.URL.revokeObjectURL(url);
                } catch (err) {
                  showToast('Erreur lors de l’export PDF', 'error');
                }
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600 }}
            >
              Exporter PDF
            </button>
            <ExportButtons 
              data={clientsList.map(c => ({ 
                ID: c.id, 
                Entreprise: c.name, 
                Contact: c.contact || '', 
                Email: c.email || '',
                Téléphone: c.phone || ''
              }))} 
              filename="clients" 
            />
            <div className="search-box">
              <input 
                type="text" 
                placeholder="Rechercher par nom, contact..." 
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
                <th>Contact</th>
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
              ) : clientsList.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    Aucun client trouvé.
                  </td>
                </tr>
              ) : clientsList.map(c => (
                <React.Fragment key={c.id}>
                  <tr>
                    <td>{c.name}</td>
                    <td>{c.contact}</td>
                    <td>{c.email}</td>
                    <td>{c.phone}</td>
                    {role === 'ADMIN' && (
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button 
                            type="button" 
                            className="ghost" 
                            onClick={() => editingId === c.id ? cancelEdit() : startEdit(c)} 
                            style={{ padding: '0.2rem 0.5rem' }}
                            title="Modifier"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button type="button" className="ghost" onClick={() => handleDelete(c.id)} style={{ padding: '0.2rem 0.5rem', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#f87171' }}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                  {editingId === c.id && (
                    <tr key={`edit-${c.id}`}>
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
                            Contact
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
                            <button type="button" className="btn-primary" onClick={() => handleSaveEdit(c.id)} disabled={isUpdating} style={{ padding: '0.5rem 0.9rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              {isUpdating ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} 
                              {isUpdating ? 'Enregistrement...' : 'Sauvegarder'}
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
                Total: {data.totalCount} clients
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
          <h2>Ajouter un client</h2>
          <form onSubmit={handleAdd} className="form-grid">
            <label>
              Nom de l'entreprise
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </label>
            <label>
              Contact
              <input
                value={contact}
                onChange={e => setContact(e.target.value)}
              />
            </label>
            <label>
              Email
              <input value={email} onChange={e => setEmail(e.target.value)} />
            </label>
            <label>
              Téléphone
              <input value={phone} onChange={e => setPhone(e.target.value)} />
            </label>
            <div>
              <button type="submit" disabled={isAdding} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {isAdding && <Loader2 size={16} className="animate-spin" />}
                {isAdding ? 'Ajout...' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
