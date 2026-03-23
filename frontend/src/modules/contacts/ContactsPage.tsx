import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../auth/useAuth';
import { Plus, Trash2, Mail, User, Phone, X, Calendar } from 'lucide-react';
import { useToast } from '../../components/Toast';

type ProspectStatus = 'A_CONTACTER' | 'CONTACTE' | 'REPONDU' | 'EN_DISCUSSION' | 'CONFIRME';

type Prospect = {
  id: string;
  name: string;
  contact: string | null;
  email: string | null;
  status: ProspectStatus;
  notes: string | null;
  createdAt: string;
};

const STATUS_LABELS: Record<ProspectStatus, string> = {
  A_CONTACTER: 'À contacter',
  CONTACTE: 'Contacté',
  REPONDU: 'Répondu',
  EN_DISCUSSION: 'En discussion',
  CONFIRME: 'Confirmé'
};

export function ContactsPage() {
  const { role } = useAuth();
  const { showToast } = useToast();
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<ProspectStatus>('A_CONTACTER');
  const [notes, setNotes] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const data = await api.get<Prospect[]>('/prospects');
      setProspects(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    try {
      await api.post('/prospects', { name, contact: contact || null, email: email || null, status, notes: notes || null });
      showToast('Contact créé avec succès !', 'success');
      setName('');
      setContact('');
      setEmail('');
      setNotes('');
      setStatus('A_CONTACTER');
      setShowAddModal(false);
      void load();
    } catch (err) {
      showToast('Erreur lors de la création du contact.', 'error');
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Voulez-vous vraiment supprimer ce contact ?")) return;
    try {
      await api.delete(`/prospects/${id}`);
      showToast('Contact supprimé.', 'success');
      void load();
    } catch {
      showToast('Erreur lors de la suppression.', 'error');
    }
  };

  const handleStatusChange = async (id: string, newStatus: ProspectStatus) => {
    try {
      await api.put(`/prospects/${id}`, { 
        name: prospects.find(p => p.id === id)?.name,
        status: newStatus 
      });
      showToast('Statut mis à jour !', 'success');
      void load();
    } catch {
      showToast('Erreur mise à jour statut.', 'error');
    }
  };

  // --- Drag & Drop Handlers ---
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('prospectId', id);
    setTimeout(() => {
      (e.target as HTMLElement).style.opacity = '0.5';
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.target as HTMLElement).style.opacity = '1';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, columnStatus: ProspectStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('prospectId');
    if (!id) return;

    const prospect = prospects.find(p => p.id === id);
    if (prospect && prospect.status !== columnStatus) {
      // Optimistic upate
      setProspects(prev => prev.map(p => p.id === id ? { ...p, status: columnStatus } : p));
      await handleStatusChange(id, columnStatus);
    }
  };

  const filtered = prospects.filter(p => {
    const s = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(s) ||
      (p.email || '').toLowerCase().includes(s) ||
      (p.contact || '').toLowerCase().includes(s)
    );
  });

  const columns: ProspectStatus[] = ['A_CONTACTER', 'CONTACTE', 'REPONDU', 'EN_DISCUSSION', 'CONFIRME'];

  if (loading) return <div className="page">Chargement...</div>;

  return (
    <div className="page">
      <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1>Contacts / Pipeline</h1>
          <p>Kanban de suivi des prospects et leads commerciaux.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div className="search-box">
            <input 
              type="text" 
              placeholder="Nom, email, tel..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ padding: '0.6rem', width: '220px', borderRadius: '0.75rem' }}
            />
          </div>
          {role === 'ADMIN' && (
            <button className="btn-primary" onClick={() => setShowAddModal(!showAddModal)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: 'fit-content' }}>
              <Plus size={18} /> {showAddModal ? 'Fermer' : 'Nouveau Contact'}
            </button>
          )}
        </div>
      </header>

      {showAddModal && (
        <section className="card glass-card" style={{ marginBottom: '2rem' }}>
          <h2>Ajouter un Prospect</h2>
          <form onSubmit={handleAdd} className="form-grid">
            <label>
              Nom / Société *
              <input value={name} onChange={e => setName(e.target.value)} required placeholder="Ex: Jean Dupont / Tech Corp" />
            </label>
            <label>
              Email
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jean@example.com" />
            </label>
            <label>
              Téléphone / Contact
              <input value={contact} onChange={e => setContact(e.target.value)} placeholder="+216 55 55 55 55" />
            </label>
            <label>
              Étape (Statut)
              <select value={status} onChange={e => setStatus(e.target.value as ProspectStatus)}>
                {Object.entries(STATUS_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </label>
            <label style={{ gridColumn: '1 / -1' }}>
              Notes / Commentaires
              <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Précisez le besoin..." rows={2} style={{ width: '100%', padding: '0.6rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
            </label>
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button type="submit" className="btn-primary" style={{ width: 'fit-content' }}>Créer le contact</button>
              <button type="button" className="ghost" onClick={() => setShowAddModal(false)}>Annuler</button>
            </div>
          </form>
        </section>
      )}

      <div className="kanban-board" style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '1rem' }}>
        {columns.map(statusKey => {
          const colProspects = filtered.filter(p => p.status === statusKey);
          const visibleProspects = colProspects.slice(0, 3);
          const hiddenProspects = colProspects.slice(3);
          return (
            <div 
              key={statusKey} 
              className="kanban-column"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, statusKey)}
              style={{ minWidth: '280px', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(15, 23, 42, 0.4)', padding: '1rem', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}
            >
              <h3 style={{ margin: 0, fontSize: '0.9rem', color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
                {STATUS_LABELS[statusKey]}
                <span style={{ background: 'rgba(255,255,255,0.1)', padding: '0.1rem 0.5rem', borderRadius: '1rem', color: '#fff' }}>{colProspects.length}</span>
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: '300px' }}>
                {visibleProspects.map(prospect => (
                  <div 
                    key={prospect.id} 
                    className="project-card"
                    draggable
                    onDragStart={(e) => handleDragStart(e, prospect.id)}
                    onDragEnd={handleDragEnd}
                    onClick={() => setSelectedProspect(prospect)}
                    style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '1rem', borderRadius: '0.75rem', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.05)', transition: 'all 0.2s ease', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#f8fafc', fontWeight: 600 }}>{prospect.name}</h4>
                      {role === 'ADMIN' && (
                        <button className="ghost" onClick={(e) => handleDelete(prospect.id, e)} style={{ padding: '0.2rem', margin: '-0.2rem', color: '#ef4444' }}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                      {prospect.email && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Mail size={12} /> {prospect.email}
                        </div>
                      )}
                      {prospect.contact ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Phone size={12} /> {prospect.contact}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#475569' }}>
                          <Phone size={12} /> Pas de tel
                        </div>
                      )}
                    </div>

                    {prospect.notes && (
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic', background: 'rgba(0,0,0,0.1)', padding: '0.4rem', borderRadius: '0.4rem' }}>
                        {prospect.notes}
                      </div>
                    )}

                    <div style={{ marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <select 
                        value={prospect.status}
                        onChange={(e) => { e.stopPropagation(); handleStatusChange(prospect.id, e.target.value as ProspectStatus); }}
                        onClick={e => e.stopPropagation()}
                        style={{ width: '100%', fontSize: '0.75rem', padding: '0.3rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0', borderRadius: '0.4rem', cursor: 'pointer', outline: 'none' }}
                      >
                        {Object.entries(STATUS_LABELS).map(([val, label]) => (
                          <option key={val} value={val} style={{ color: '#000' }}>{label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
                
                {hiddenProspects.length > 0 && (
                  <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 0.25rem 0.5rem', fontWeight: 600, textTransform: 'uppercase' }}>
                      Autres contacts (+{hiddenProspects.length})
                    </p>
                    {hiddenProspects.map(p => (
                      <div 
                        key={p.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, p.id)}
                        onDragEnd={handleDragEnd}
                        onClick={() => setSelectedProspect(p)}
                        style={{ 
                          background: 'rgba(30, 41, 59, 0.4)', 
                          padding: '0.6rem 0.8rem', 
                          borderRadius: '0.5rem', 
                          cursor: 'pointer', 
                          border: '1px solid rgba(255,255,255,0.03)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '0.85rem',
                          transition: 'background 0.2s'
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(63, 66, 241, 0.1)')}
                        onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(30, 41, 59, 0.4)')}
                      >
                        <span style={{ color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>
                          {p.name}
                        </span>
                        <span style={{ color: '#64748b', fontSize: '0.7rem' }}>{p.email ? 'Email' : 'Info'}</span>
                      </div>
                    ))}
                  </div>
                )}
                
                {colProspects.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#475569', fontSize: '0.8rem', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '0.75rem', height: '100%' }}>
                    Glissez un prospect ici
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Prospect Details Modal */}
      {selectedProspect && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }} onClick={() => setSelectedProspect(null)}>
          <div className="card glass-card" style={{ width: '100%', maxWidth: '500px', background: '#0f172a', padding: '2rem', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.1)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', margin: 0, color: '#f8fafc' }}>{selectedProspect.name}</h2>
                <div style={{ color: '#6366f1', fontSize: '0.85rem', marginTop: '0.2rem' }}>Prospect / Lead</div>
              </div>
              <button className="ghost" onClick={() => setSelectedProspect(null)} style={{ padding: '0.5rem' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#e2e8f0' }}>
                <Mail size={18} style={{ color: '#94a3b8' }} />
                <div>{selectedProspect.email || <span style={{ color: '#475569', fontStyle: 'italic' }}>Non renseigné</span>}</div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#e2e8f0' }}>
                <Phone size={18} style={{ color: '#94a3b8' }} />
                <div>{selectedProspect.contact || <span style={{ color: '#475569', fontStyle: 'italic' }}>Pas de numéro</span>}</div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#e2e8f0' }}>
                <Calendar size={18} style={{ color: '#94a3b8' }} />
                <div>Ajouté le {new Date(selectedProspect.createdAt).toLocaleDateString('fr-FR')}</div>
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <p style={{ margin: '0 0 0.5rem', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Notes / Commentaires</p>
              <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '0.75rem', color: '#e2e8f0', fontSize: '0.9rem', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                {selectedProspect.notes || <span style={{ fontStyle: 'italic', color: '#64748b' }}>Aucune note.</span>}
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <select 
                value={selectedProspect.status}
                onChange={(e) => handleStatusChange(selectedProspect.id, e.target.value as ProspectStatus)}
                style={{ width: '100%', padding: '0.6rem', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)', color: '#fff', borderRadius: '0.5rem' }}
              >
                {Object.entries(STATUS_LABELS).map(([val, label]) => (
                  <option key={val} value={val} style={{ color: '#000' }}>{label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
