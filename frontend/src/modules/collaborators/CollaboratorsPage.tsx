import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../auth/useAuth';
import { Edit2, ShieldAlert, Trash2, Check, X, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { ExportButtons } from '../../components/ExportButtons';
import { useToast } from '../../components/Toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';

type User = {
  id: string;
  name: string | null;
  email: string;
  role: string;
};

type Collaborator = {
  id: string;
  userId: string;
  expertise: string | null;
  socialHandle: string | null;
  phone: string | null;
  user: User;
};

type PaginatedCollaborators = {
  data: Collaborator[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
};

export function CollaboratorsPage() {
  const { role } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Add form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [expertise, setExpertise] = useState('');
  const [socialHandle, setSocialHandle] = useState('');
  const [phone, setPhone] = useState('');

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editExpertise, setEditExpertise] = useState('');
  const [editSocial, setEditSocial] = useState('');
  const [editPhone, setEditPhone] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const { data, isLoading } = useQuery({
    queryKey: ['collaborators', page, debouncedSearch],
    queryFn: () => api.get<PaginatedCollaborators>(`/collaborators?page=${page}&limit=${limit}${debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : ''}`)
  });

  const collaboratorsList = data?.data || [];

  const reloadData = () => {
    queryClient.invalidateQueries({ queryKey: ['collaborators'] });
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;
    try {
      await api.post<Collaborator>('/collaborators', { name, email, expertise, socialHandle, phone });
      showToast('Collaborateur ajouté !', 'success');
      setName(''); setEmail(''); setExpertise(''); setSocialHandle(''); setPhone('');
      reloadData();
    } catch {
      showToast('Erreur lors de l\'ajout du collaborateur.', 'error');
    }
  };

  const startEdit = (c: Collaborator) => {
    setEditingId(c.id);
    setEditName(c.user.name || '');
    setEditExpertise(c.expertise || '');
    setEditSocial(c.socialHandle || '');
    setEditPhone(c.phone || '');
  };

  const cancelEdit = () => setEditingId(null);

  const handleSaveEdit = async (c: Collaborator) => {
    try {
      await api.put(`/collaborators/${c.id}`, {
        name: editName,
        email: c.user.email, // email stays the same
        expertise: editExpertise,
        socialHandle: editSocial,
        phone: editPhone
      });
      showToast('Données mises à jour !', 'success');
      setEditingId(null);
      reloadData();
    } catch {
      showToast('Erreur lors de la mise à jour.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer ce collaborateur ?')) return;
    try {
      await api.delete(`/collaborators/${id}`);
      showToast('Collaborateur supprimé.', 'success');
      reloadData();
    } catch {
      showToast('Erreur lors de la suppression.', 'error');
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1>Collaborateurs</h1>
        <p>Annuaire des experts et freelances internes.</p>
      </header>

      <section className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h2>Liste des collaborateurs</h2>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <ExportButtons 
              data={collaboratorsList.map(c => ({
                Nom: c.user.name || '—',
                Email: c.user.email,
                Rôle: c.user.role,
                Expertise: c.expertise || '—',
                Téléphone: c.phone || '—',
                Réseau_Social: c.socialHandle || '—'
              }))}
              filename="collaborateurs"
            />
            <input
              type="text"
              placeholder="Rechercher..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ padding: '0.5rem 0.75rem', borderRadius: '0.75rem', width: '240px', maxWidth: '100%' }}
            />
          </div>
        </div>
        <div className="table-responsive">
          <table className="lines-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Email</th>
                <th>Rôle</th>
                <th>Expertise</th>
                <th>Téléphone</th>
                <th>Réseau Social</th>
                {role === 'ADMIN' && <th style={{ width: 100 }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    <Loader2 className="spinner" size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto' }} />
                  </td>
                </tr>
              ) : collaboratorsList.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem 1rem' }}>
                    Aucun collaborateur trouvé.
                  </td>
                </tr>
              ) : collaboratorsList.map(c => (
                <div key={c.id} style={{ display: 'contents' }}>
                  <tr>
                    <td>{c.user.name || '—'}</td>
                    <td>{c.user.email}</td>
                    <td>
                      <span className={`status ${c.user.role === 'ADMIN' ? 'status-late' : 'status-paid'}`}>
                        {c.user.role === 'ADMIN' ? <ShieldAlert size={12} style={{ marginRight: 4 }} /> : null}
                        {c.user.role}
                      </span>
                    </td>
                    <td>{c.expertise || '—'}</td>
                    <td>{c.phone || '—'}</td>
                    <td>{c.socialHandle || '—'}</td>
                    {role === 'ADMIN' && (
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button
                            type="button"
                            className="ghost"
                            onClick={() => editingId === c.id ? cancelEdit() : startEdit(c)}
                            style={{ padding: '0.25rem 0.5rem' }}
                            title="Modifier"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            type="button"
                            className="ghost"
                            onClick={() => handleDelete(c.id)}
                            style={{ padding: '0.25rem 0.5rem', color: '#f87171' }}
                            title="Supprimer"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                  {editingId === c.id && (
                    <tr key={`edit-${c.id}`}>
                      <td colSpan={7} style={{ padding: '0' }}>
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
                            Nom complet
                            <input value={editName} onChange={e => setEditName(e.target.value)} style={{ padding: '0.5rem' }} />
                          </label>
                          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            Expertise
                            <input value={editExpertise} onChange={e => setEditExpertise(e.target.value)} placeholder="Design, Dev…" style={{ padding: '0.5rem' }} />
                          </label>
                          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            Réseau social
                            <input value={editSocial} onChange={e => setEditSocial(e.target.value)} placeholder="LinkedIn…" style={{ padding: '0.5rem' }} />
                          </label>
                          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            Téléphone
                            <input value={editPhone} onChange={e => setEditPhone(e.target.value)} style={{ padding: '0.5rem' }} />
                          </label>
                          <div style={{ display: 'flex', gap: '0.5rem', paddingBottom: '0.1rem' }}>
                            <button type="button" className="btn-primary" onClick={() => handleSaveEdit(c)} style={{ padding: '0.5rem 0.9rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
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
                </div>
              ))}
            </tbody>
          </table>

          {data && data.totalPages > 1 && (
            <div style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Total: {data.totalCount} collaborateurs
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
          <h2>Ajouter un collaborateur</h2>
          <form onSubmit={handleAdd} className="form-grid">
            <label>Nom complet <input value={name} onChange={e => setName(e.target.value)} required /></label>
            <label>Email (identifiant) <input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></label>
            <label>Expertise <input value={expertise} onChange={e => setExpertise(e.target.value)} placeholder="ex: Design, Développement" /></label>
            <label>Téléphone <input value={phone} onChange={e => setPhone(e.target.value)} /></label>
            <label>Réseaux sociaux <input value={socialHandle} onChange={e => setSocialHandle(e.target.value)} placeholder="LinkedIn, Twitter..." /></label>
            <div><button type="submit" className="btn-primary">Enregistrer</button></div>
          </form>
        </section>
      )}
    </div>
  );
}
