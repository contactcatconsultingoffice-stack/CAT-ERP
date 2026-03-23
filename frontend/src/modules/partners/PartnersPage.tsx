import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../auth/useAuth';
import { Edit2, Trash2, Check, X } from 'lucide-react';
import { ExportButtons } from '../../components/ExportButtons';
import { useToast } from '../../components/Toast';

type Partner = {
  id: string;
  name: string;
  contact?: string | null;
  email?: string | null;
  phone?: string | null;
};

export function PartnersPage() {
  const { role } = useAuth();
  const { showToast } = useToast();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [search, setSearch] = useState('');

  // Add form
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Inline edit state: which row is being edited
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editContact, setEditContact] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');

  const load = async () => {
    try {
      const data = await api.get<Partner[]>('/partners');
      setPartners(data);
    } catch {
      // ignore
    }
  };

  useEffect(() => { void load(); }, []);

  const filteredPartners = partners.filter(p =>
    (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.contact || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.phone || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    try {
      await api.post<Partner>('/partners', { name, contact, email, phone });
      showToast('Partenaire ajouté !', 'success');
      setName(''); setContact(''); setEmail(''); setPhone('');
      void load();
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
      void load();
    } catch {
      showToast('Erreur lors de la mise à jour.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer ce partenaire ?')) return;
    try {
      showToast('Partenaire supprimé.', 'success');
      void load();
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
              data={filteredPartners.map(p => ({ 
                ID: p.id, 
                Entreprise: p.name, 
                Interlocuteur: p.contact || '', 
                Email: p.email || '',
                Téléphone: p.phone || '' 
              }))}
              filename="partenaires"
            />
            <input
              type="text"
              placeholder="Rechercher un partenaire..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ padding: '0.5rem 0.75rem', borderRadius: '0.75rem', width: '260px', maxWidth: '100%' }}
            />
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
              {filteredPartners.map(p => (
                <div key={p.id} style={{ display: 'contents' }}>
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
                  {/* Inline edit row */}
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
                </div>
              ))}
              {filteredPartners.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem 1rem' }}>
                    Aucun partenaire enregistré.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
