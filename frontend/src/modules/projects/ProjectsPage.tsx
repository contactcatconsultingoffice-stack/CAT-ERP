import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../auth/useAuth';
import { 
  Plus, 
  Trash2, 
  User, 
  Briefcase, 
  Layers,
  X,
  Calendar,
  Hash
} from 'lucide-react';
import { ExportButtons } from '../../components/ExportButtons';
import { useToast } from '../../components/Toast';
type ProjectStatus = 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD';
type ProjectType = 'PORTFOLIO' | 'BLOG' | 'ECOMMERCE' | 'APPLICATION';
type Priority = 'LOW' | 'MEDIUM' | 'HIGH';

type Project = {
  id: string;
  reference: string | null;
  name: string;
  type: ProjectType;
  status: ProjectStatus;
  priority: Priority;
  clientId: string;
  description?: string | null;
  createdAt: string;
  client?: { name: string; contact?: string; email?: string };
  partner?: { name: string };
};

type ClientRef = { id: string; name: string };
type PartnerRef = { id: string; name: string };

const STATUS_LABELS: Record<ProjectStatus, string> = {
  PLANNING: 'Planification',
  IN_PROGRESS: 'En cours',
  COMPLETED: 'Terminé',
  ON_HOLD: 'En pause'
};

const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: 'Basse',
  MEDIUM: 'Moyenne',
  HIGH: 'Haute'
};

const PRIORITY_COLORS: Record<Priority, string> = {
  LOW: '#64748b',
  MEDIUM: '#3b82f6',
  HIGH: '#ef4444'
};

export function ProjectsPage() {
  const { role } = useAuth();
  const { showToast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<ClientRef[]>([]);
  const [partners, setPartners] = useState<PartnerRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState<ProjectType>('PORTFOLIO');
  const [status, setStatus] = useState<ProjectStatus>('PLANNING');
  const [priority, setPriority] = useState<Priority>('MEDIUM');
  const [clientId, setClientId] = useState('');
  const [partnerId, setPartnerId] = useState('');
  const [description, setDescription] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const [proj, cls, parts] = await Promise.all([
        api.get<Project[]>('/projects'),
        api.get<ClientRef[]>('/clients'),
        api.get<PartnerRef[]>('/partners')
      ]);
      setProjects(proj);
      setClients(cls);
      setPartners(parts);
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
    if (!name || !clientId) return;
    try {
      await api.post('/projects', { name, type, status, priority, clientId, partnerId: partnerId || null, description });
      showToast('Projet créé avec succès !', 'success');
      setName('');
      setDescription('');
      setClientId('');
      setPartnerId('');
      setShowAddModal(false);
      void load();
    } catch (err) {
      showToast('Erreur lors de la création du projet.', 'error');
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Voulez-vous vraiment supprimer ce projet ?")) return;
    try {
      await api.delete(`/projects/${id}`);
      showToast('Projet supprimé.', 'success');
      if (selectedProject?.id === id) setSelectedProject(null);
      void load();
    } catch {
      showToast('Erreur lors de la suppression.', 'error');
    }
  };

  const handleStatusChange = async (id: string, newStatus: ProjectStatus) => {
    try {
      await api.put(`/projects/${id}`, { status: newStatus });
      showToast('Statut mis à jour !', 'success');
      void load();
    } catch {
      showToast('Erreur mise à jour statut.', 'error');
    }
  };

  const handlePriorityChange = async (id: string, newPriority: Priority) => {
    try {
      await api.put(`/projects/${id}`, { priority: newPriority });
      showToast('Priorité mise à jour !', 'success');
      void load();
    } catch {
      showToast('Erreur mise à jour priorité.', 'error');
    }
  };

  // --- Drag & Drop Handlers ---
  const handleDragStart = (e: React.DragEvent, projectId: string) => {
    e.dataTransfer.setData('projectId', projectId);
    // Optional: make the dragged item slightly transparent
    setTimeout(() => {
      (e.target as HTMLElement).style.opacity = '0.5';
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.target as HTMLElement).style.opacity = '1';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necessary to allow dropping
  };

  const handleDrop = async (e: React.DragEvent, columnStatus: ProjectStatus) => {
    e.preventDefault();
    const projectId = e.dataTransfer.getData('projectId');
    if (!projectId) return;

    const project = projects.find(p => p.id === projectId);
    if (project && project.status !== columnStatus) {
      // Optimistic update
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status: columnStatus } : p));
      await handleStatusChange(projectId, columnStatus);
    }
  };

  const filtered = projects.filter(p => {
    const s = search.toLowerCase();
    return (
      (p.name || '').toLowerCase().includes(s) ||
      (p.client?.name || '').toLowerCase().includes(s) ||
      (p.reference || '').toLowerCase().includes(s)
    );
  });

  const columns: ProjectStatus[] = ['PLANNING', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED'];

  if (loading) return <div className="page">Chargement...</div>;

  return (
    <div className="page">
      <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1>Projets</h1>
          <p>Kanban interactif — déplacez les cartes ou cliquez pour les détails.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <ExportButtons 
            data={filtered.map(p => ({
              Référence: p.reference || 'N/A',
              Nom: p.name,
              Type: p.type,
              Statut: p.status,
              Priorité: p.priority,
              Client: p.client?.name || 'Inconnu',
              Partenaire: p.partner?.name || 'Aucun',
              Créé_le: new Date(p.createdAt).toLocaleDateString('fr-FR')
            }))}
            filename="projets"
          />
          <div className="search-box">
            <input 
              type="text" 
              placeholder="Réf, nom, client..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ padding: '0.6rem', width: '220px', borderRadius: '0.75rem' }}
            />
          </div>
          {role === 'ADMIN' && (
            <button className="btn-primary" onClick={() => setShowAddModal(!showAddModal)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: 'fit-content' }}>
              <Plus size={18} /> {showAddModal ? 'Fermer' : 'Nouveau Projet'}
            </button>
          )}
        </div>
      </header>

      {showAddModal && (
        <section className="card glass-card" style={{ marginBottom: '2rem' }}>
          <h2>Créer un nouveau projet</h2>
          <form onSubmit={handleAdd} className="form-grid">
            <label>
              Nom du projet *
              <input value={name} onChange={e => setName(e.target.value)} required placeholder="Nom explicite" />
            </label>
            <label>
              Client *
              <select value={clientId} onChange={e => setClientId(e.target.value)} required>
                <option value="">Sélectionner...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label>
              Partenaire (optionnel)
              <select value={partnerId} onChange={e => setPartnerId(e.target.value)}>
                <option value="">Aucun</option>
                {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            <label>
              Type *
              <select value={type} onChange={e => setType(e.target.value as ProjectType)}>
                <option value="PORTFOLIO">Portfolio</option>
                <option value="BLOG">Blog</option>
                <option value="ECOMMERCE">E-commerce</option>
                <option value="APPLICATION">Application</option>
              </select>
            </label>
            <label>
              Priorité
              <select value={priority} onChange={e => setPriority(e.target.value as Priority)}>
                {Object.entries(PRIORITY_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </label>
            <label>
              Statut initial
              <select value={status} onChange={e => setStatus(e.target.value as ProjectStatus)}>
                {Object.entries(STATUS_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </label>
            <label style={{ gridColumn: '1 / -1' }}>
              Description détaillée
              <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Objectifs, spécifications..." rows={3} />
            </label>
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button type="submit" className="btn-primary" style={{ width: 'fit-content' }}>Générer le projet (Réf auto)</button>
              <button type="button" className="ghost" onClick={() => setShowAddModal(false)}>Annuler</button>
            </div>
          </form>
        </section>
      )}

      <div className="kanban-board" style={{ display: 'flex', gap: '1.5rem', overflowX: 'auto', paddingBottom: '1rem' }}>
        {columns.map(statusKey => {
          const columnProjects = filtered.filter(p => p.status === statusKey);
          const visibleProjects = columnProjects.slice(0, 3);
          const hiddenProjects = columnProjects.slice(3);
          return (
            <div 
              key={statusKey} 
              className="kanban-column"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, statusKey)}
              style={{ minWidth: '300px', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(15, 23, 42, 0.4)', padding: '1rem', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}
            >
              <h3 style={{ margin: 0, fontSize: '0.9rem', color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
                {STATUS_LABELS[statusKey]}
                <span style={{ background: 'rgba(255,255,255,0.1)', padding: '0.1rem 0.5rem', borderRadius: '1rem', color: '#fff' }}>{columnProjects.length}</span>
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: '150px' }}>
                {visibleProjects.map(project => (
                  <div 
                    key={project.id} 
                    className="project-card"
                    draggable
                    onDragStart={(e) => handleDragStart(e, project.id)}
                    onDragEnd={handleDragEnd}
                    onClick={() => setSelectedProject(project)}
                    style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '1rem', borderRadius: '0.75rem', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.05)', transition: 'all 0.2s ease', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#6366f1', fontSize: '0.75rem', fontWeight: 600 }}>
                        <Hash size={12} /> {project.reference || 'PRJ-N/A'}
                        <span style={{ 
                          width: '8px', 
                          height: '8px', 
                          borderRadius: '50%', 
                          background: PRIORITY_COLORS[project.priority],
                          marginLeft: '4px'
                        }} title={`Priorité: ${PRIORITY_LABELS[project.priority]}`} />
                      </div>
                      <select 
                        value={project.status}
                        onChange={(e) => { e.stopPropagation(); handleStatusChange(project.id, e.target.value as ProjectStatus); }}
                        onClick={e => e.stopPropagation()}
                        style={{ fontSize: '0.7rem', padding: '0.1rem 0.3rem', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#cbd5e1', borderRadius: '0.4rem', cursor: 'pointer' }}
                      >
                        {Object.entries(STATUS_LABELS).map(([val, label]) => (
                          <option key={val} value={val} style={{ color: '#000' }}>{label}</option>
                        ))}
                      </select>
                    </div>

                    <h4 style={{ margin: '0 0 0.5rem', fontSize: '1.05rem', color: '#f8fafc' }}>{project.name}</h4>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
                      <User size={14} /> {project.client?.name || 'Client inconnu'}
                    </div>

                    {project.description && (
                      <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 1rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {project.description}
                      </p>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem', marginTop: 'auto' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: '#94a3b8' }}>
                        <Briefcase size={12} /> {project.type}
                      </span>
                      <select 
                        value={project.priority}
                        onChange={(e) => { e.stopPropagation(); handlePriorityChange(project.id, e.target.value as Priority); }}
                        onClick={e => e.stopPropagation()}
                        style={{ fontSize: '0.7rem', padding: '0.1rem 0.3rem', background: 'rgba(255,255,255,0.05)', border: 'none', color: PRIORITY_COLORS[project.priority], borderRadius: '0.4rem', cursor: 'pointer' }}
                      >
                        {Object.entries(PRIORITY_LABELS).map(([val, label]) => (
                          <option key={val} value={val} style={{ color: '#000' }}>{label}</option>
                        ))}
                      </select>
                      {role === 'ADMIN' && (
                        <button className="ghost" onClick={(e) => handleDelete(project.id, e)} style={{ padding: '0.2rem', color: '#ef4444' }}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {hiddenProjects.length > 0 && (
                  <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 0.25rem 0.5rem', fontWeight: 600, textTransform: 'uppercase' }}>
                      Autres projets (+{hiddenProjects.length})
                    </p>
                    {hiddenProjects.map(project => (
                      <div 
                        key={project.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, project.id)}
                        onDragEnd={handleDragEnd}
                        onClick={() => setSelectedProject(project)}
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
                        <span style={{ color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>
                          {project.name}
                        </span>
                        <span style={{ color: '#6366f1', fontSize: '0.7rem' }}>{project.reference}</span>
                      </div>
                    ))}
                  </div>
                )}
                
                {columnProjects.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#475569', fontSize: '0.8rem', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '0.75rem' }}>
                    Glissez un projet ici
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Project Details Modal */}
      {selectedProject && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }} onClick={() => setSelectedProject(null)}>
          <div className="card glass-card" style={{ width: '100%', maxWidth: '600px', background: '#0f172a', padding: '2rem', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.1)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div>
                <div style={{ color: '#6366f1', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                  <Hash size={16} /> {selectedProject.reference || 'PRJ-N/A'}
                </div>
                <h2 style={{ fontSize: '1.75rem', margin: 0, color: '#f8fafc' }}>{selectedProject.name}</h2>
              </div>
              <button className="ghost" onClick={() => setSelectedProject(null)} style={{ padding: '0.5rem' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem', padding: '1.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.75rem' }}>
              <div>
                <p style={{ margin: '0 0 0.3rem', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Client</p>
                <div style={{ color: '#e2e8f0', fontWeight: 500 }}>{selectedProject.client?.name}</div>
                {selectedProject.client?.email && <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.2rem' }}>{selectedProject.client.email}</div>}
              </div>
              
              <div>
                <p style={{ margin: '0 0 0.3rem', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Interlocuteur</p>
                <div style={{ color: '#e2e8f0' }}>{selectedProject.client?.contact || 'N/A'}</div>
              </div>

              <div>
                <p style={{ margin: '0 0 0.3rem', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Partenaire</p>
                <div style={{ color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Layers size={14} /> {selectedProject.partner?.name || 'Aucun'}</div>
              </div>

              <div>
                <p style={{ margin: '0 0 0.3rem', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date de création</p>
                <div style={{ color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Calendar size={14} /> {new Date(selectedProject.createdAt).toLocaleDateString('fr-FR')}</div>
              </div>

              <div>
                <p style={{ margin: '0 0 0.3rem', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Priorité</p>
                <div style={{ color: PRIORITY_COLORS[selectedProject.priority], fontWeight: 600 }}>{PRIORITY_LABELS[selectedProject.priority]}</div>
              </div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <p style={{ margin: '0 0 0.5rem', color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description détaillée</p>
              <div style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '0.75rem', color: '#e2e8f0', fontSize: '0.95rem', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                {selectedProject.description || <span style={{ fontStyle: 'italic', color: '#64748b' }}>Aucune description fournie.</span>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
