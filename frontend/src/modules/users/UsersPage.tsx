import { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../auth/useAuth';
import { Trash2, UserPlus, Shield, User as UserIcon, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '../../components/Toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';

type User = {
  id: string;
  email: string;
  name: string | null;
  role: 'ADMIN' | 'COLLABORATOR';
  isSuperAdmin: boolean;
  createdAt: string;
  permissions: string[];
  collaborator?: {
    expertise: string | null;
  };
};

type PaginatedUsers = {
  data: User[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
};

const MODULE_OPTIONS = [
  { id: 'clients', label: 'Clients' },
  { id: 'projects', label: 'Projets' },
  { id: 'partners', label: 'Partenaires' },
  { id: 'collaborators', label: 'Collaborateurs' },
  { id: 'contacts', label: 'Contacts CRM' },
  { id: 'financial', label: 'Finance' },
  { id: 'contracts', label: 'Contrats' },
  { id: 'missions', label: 'Missions' },
];

export function UsersPage() {
  const { user } = useAuth();
  const authRole = user?.role;
  const isSuperAdmin = user?.isSuperAdmin;
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState<{ id: string, email: string } | null>(null);
  const [showPermissionsModal, setShowPermissionsModal] = useState<User | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [newPasswordForUser, setNewPasswordForUser] = useState('');
  
  const [filter, setFilter] = useState<'ALL' | 'ADMIN' | 'COLLABORATOR'>('ALL');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filter]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['users', page, debouncedSearch, filter],
    queryFn: () => api.get<PaginatedUsers>(`/users?page=${page}&limit=${limit}&role=${filter}${debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : ''}`)
  });

  const usersList = data?.data || [];

  const reloadUsers = () => {
    queryClient.invalidateQueries({ queryKey: ['users'] });
  };
  
  // New User Form
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [newRole, setNewRole] = useState<'ADMIN' | 'COLLABORATOR'>('COLLABORATOR');

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/users', { email, name, password, role: newRole });
      setShowAddModal(false);
      setEmail('');
      setName('');
      setPassword('');
      setNewRole('COLLABORATOR');
      showToast('Utilisateur créé !', 'success');
      reloadUsers();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erreur lors de la création.', 'error');
    }
  };

  const handleDeleteUser = async (id: string, role: string) => {
    if (role === 'ADMIN' && !isSuperAdmin) {
      showToast("Seul le Super Administrateur peut supprimer un Admin.", "error");
      return;
    }
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return;
    try {
      await api.delete(`/users/${id}`);
      showToast('Utilisateur supprimé.', 'success');
      reloadUsers();
    } catch (err) {
      showToast('Erreur lors de la suppression.', 'error');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showPasswordModal) return;
    try {
      await api.put(`/users/${showPasswordModal.id}/password`, { newPassword: newPasswordForUser });
      showToast('Mot de passe mis à jour !', 'success');
      setShowPasswordModal(null);
      setNewPasswordForUser('');
    } catch (err) {
      showToast('Erreur lors de la mise à jour.', 'error');
    }
  };

  const handleUpdatePermissions = async () => {
    if (!showPermissionsModal) return;
    try {
      await api.put(`/users/${showPermissionsModal.id}/permissions`, { permissions: selectedPermissions });
      showToast('Permissions mises à jour !', 'success');
      setShowPermissionsModal(null);
      reloadUsers();
    } catch (err) {
      showToast('Erreur lors de la mise à jour des droits.', 'error');
    }
  };

  const togglePermission = (id: string) => {
    setSelectedPermissions(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1>Utilisateurs</h1>
        <p>Gérez les comptes et les accès de la plateforme.</p>
      </header>

      {showAddModal && (
        <div className="card glass-card" style={{ marginBottom: '2rem', border: '1px solid rgba(129, 140, 248, 0.3)' }}>
          <h2 style={{ color: '#818cf8', marginBottom: '1rem' }}>Créer un nouvel accès</h2>
          <form onSubmit={handleAddUser} className="form-grid">
            <label>
              Nom complet
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Jean Dupont" required />
            </label>
            <label>
              Email (identifiant)
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jean@cat-consulting.com" required />
            </label>
            <label>
              Mot de passe initial
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
            </label>
            <label>
              Type de compte
              <select value={newRole} onChange={e => setNewRole(e.target.value as any)}>
                <option value="COLLABORATOR">Collaborateur (Gestion de dossiers)</option>
                <option value="ADMIN">Associé (Accès complet)</option>
              </select>
            </label>
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button type="submit" className="btn-primary">Confirmer la création</button>
              <button type="button" className="ghost" onClick={() => setShowAddModal(false)}>Annuler</button>
            </div>
          </form>
        </div>
      )}

      {showPermissionsModal && (
        <div 
          style={{ 
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', 
            background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', 
            justifyContent: 'center', zIndex: 1000 
          }}
          onClick={() => setShowPermissionsModal(null)}
        >
          <div className="card glass-card" style={{ width: '450px', background: '#1c1c1c' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ marginBottom: '1rem', color: '#818cf8' }}>Droits d'accès</h2>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1.5rem' }}>
              Module autorisés pour <strong>{showPermissionsModal.email}</strong>
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '2rem' }}>
              {MODULE_OPTIONS.map(opt => (
                <label key={opt.id} style={{ 
                  display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer',
                  padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px'
                }}>
                  <input 
                    type="checkbox" 
                    checked={selectedPermissions.includes(opt.id)}
                    onChange={() => togglePermission(opt.id)}
                  />
                  <span style={{ fontSize: '0.9rem' }}>{opt.label}</span>
                </label>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn-primary" onClick={handleUpdatePermissions}>Enregistrer</button>
              <button className="ghost" onClick={() => setShowPermissionsModal(null)}>Annuler</button>
            </div>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <div 
          style={{ 
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', 
            background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', 
            justifyContent: 'center', zIndex: 1000 
          }}
          onClick={() => setShowPasswordModal(null)}
        >
          <div className="card glass" style={{ width: '400px' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ marginBottom: '1rem' }}>Changer mot de passe</h2>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1.5rem' }}>
              Utilisateur : <strong>{showPasswordModal.email}</strong>
            </p>
            <form onSubmit={handleChangePassword}>
              <label>
                Nouveau mot de passe
                <input 
                  type="password" 
                  value={newPasswordForUser} 
                  onChange={e => setNewPasswordForUser(e.target.value)} 
                  placeholder="••••••••" 
                  autoFocus
                  required 
                />
              </label>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="submit" className="btn-primary">Enregistrer</button>
                <button type="button" className="ghost" onClick={() => setShowPasswordModal(null)}>Annuler</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <section className="card">
        <div className="table-header-filters" style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span className="text-sm">Rôle:</span>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-2 py-1 rounded border border-gray-200"
              style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid #ddd' }}
            >
              <option value="ALL">Tous</option>
              <option value="ADMIN">Associés</option>
              <option value="COLLABORATOR">Collaborateurs</option>
            </select>
          </div>

          <div className="search-box">
            <input 
              type="text" 
              placeholder="Rechercher un utilisateur..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid #ddd', width: '250px' }}
            />
          </div>
          
          {isSuperAdmin && (
            <button
              onClick={() => setShowAddModal(true)}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: 'fit-content' }}
            >
              <UserPlus size={18} />
              Nouvel utilisateur
            </button>
          )}
        </div>

        {error ? (
          <p style={{ color: '#f87171' }}>Une erreur est survenue lors du chargement des utilisateurs.</p>
        ) : (
          <div className="table-responsive">
            <table className="lines-table">
              <thead>
                <tr>
                  <th>Utilisateur</th>
                  <th>Rôle</th>
                  <th>Date de création</th>
                  <th style={{ width: 80, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      <Loader2 className="spinner" size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto' }} />
                    </td>
                  </tr>
                ) : usersList.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                      Aucun membre trouvé dans cette catégorie.
                    </td>
                  </tr>
                ) : usersList.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ 
                          width: '32px', height: '32px', borderRadius: '50%', 
                          background: u.role === 'ADMIN' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(148, 163, 184, 0.1)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: u.role === 'ADMIN' ? '#818cf8' : '#94a3b8'
                        }}>
                          {u.role === 'ADMIN' ? <Shield size={16} /> : <UserIcon size={16} />}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{u.name || 'Sans nom'}</div>
                          <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`status ${u.role === 'ADMIN' ? 'status-paid' : ''}`} style={{ 
                        background: u.role === 'ADMIN' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(148, 163, 184, 0.1)',
                        color: u.role === 'ADMIN' ? '#818cf8' : '#94a3b8',
                        border: 'none',
                        fontSize: '0.75rem'
                      }}>
                        {u.isSuperAdmin ? 'SUPER ADMIN' : u.role === 'ADMIN' ? 'ASSOCIÉ' : 'COLLABORATEUR'}
                      </span>
                    </td>
                    <td style={{ color: '#64748b' }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
                        {isSuperAdmin && (
                          <button 
                            className="ghost" 
                            onClick={() => setShowPasswordModal({ id: u.id, email: u.email })} 
                            title="Changer le mot de passe"
                            style={{ padding: '0.4rem', color: '#f59e0b' }}
                          >
                            <Shield size={18} />
                          </button>
                        )}
                        {isSuperAdmin && (u.id !== showPermissionsModal?.id) && (
                          <button 
                            className="ghost" 
                            onClick={() => {
                              setShowPermissionsModal(u);
                              setSelectedPermissions(u.permissions || []);
                            }} 
                            title="Gérer les permissions"
                            style={{ padding: '0.4rem', color: '#818cf8' }}
                          >
                            <Shield size={18} style={{ opacity: 0.7 }} />
                          </button>
                        )}
                        {isSuperAdmin && (
                          <button className="ghost delete-btn" onClick={() => handleDeleteUser(u.id, u.role)} style={{ padding: '0.4rem' }}>
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {data && data.totalPages > 1 && (
              <div style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Total: {data.totalCount} utilisateurs
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
        )}
      </section>
    </div>
  );
}
