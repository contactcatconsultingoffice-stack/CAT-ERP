import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../auth/useAuth';
import { Edit2, Trash2, Check, X } from 'lucide-react';
import { ExportButtons } from '../../components/ExportButtons';
import { useToast } from '../../components/Toast';

type Client = {
  id: string;
  name: string;
  contact?: string | null;
  email?: string | null;
  phone?: string | null;
};

export function ClientsPage() {
  const { role } = useAuth();
  const { showToast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
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

  const load = async () => {
    try {
      const data = await api.get<Client[]>('/clients');
      setClients(data);
    } catch {
      // ignore for now if backend/db not ready
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filteredClients = clients.filter(c => 
    (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.contact || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    try {
      await api.post<Client>('/clients', { name, contact, email, phone });
      showToast('Client ajouté avec succès !', 'success');
      setName('');
      setContact('');
      setEmail('');
      setPhone('');
      void load();
    } catch (err) {
      showToast('Erreur lors de l’ajout du client.', 'error');
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
    try {
      await api.put(`/clients/${id}`, { 
        name: editName, 
        contact: editContact, 
        email: editEmail, 
        phone: editPhone 
      });
      showToast('Client mis à jour !', 'success');
      setEditingId(null);
      void load();
    } catch (err) {
      showToast('Erreur lors de la mise à jour.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Voulez-vous vraiment supprimer ce client ?")) return;
    try {
      showToast('Client supprimé.', 'success');
      void load();
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
            <ExportButtons 
              data={filteredClients.map(c => ({ 
                ID: c.id, 
                Entreprise: c.name, 
                Interlocuteur: c.contact || '', 
                Email: c.email || '',
                Téléphone: c.phone || ''
              }))} 
              filename="clients" 
            />
            <div className="search-box">
              <input 
                type="text" 
                placeholder="Rechercher un client..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd', width: '300px', maxWidth: '100%' }}
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
              {filteredClients.map(c => (
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
                            <button type="button" className="btn-primary" onClick={() => handleSaveEdit(c.id)} style={{ padding: '0.5rem 0.9rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
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
              Interlocuteur
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
              <button type="submit">Enregistrer</button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
