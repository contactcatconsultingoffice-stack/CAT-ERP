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
      <header className="page-header">
        <h1>Projets</h1>
        <p>Kanban interactif — déplacez les cartes ou cliquez pour les détails.</p>
      </header>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div className="search-box">
          <input 
            type="text" 
            placeholder="Réf, nom, client..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
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
          {role === 'ADMIN' && (
            <button className="btn-primary" onClick={() => setShowAddModal(!showAddModal)}>
              <Plus size={18} /> {showAddModal ? 'Fermer' : 'Nouveau Projet'}
            </button>
          )}
        </div>
      </div>

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

      <div className="kanban-board">
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
            >
              <h3 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className={"status status-" + statusKey.toLowerCase()}>{STATUS_LABELS[statusKey]}</span>
                <span style={{ background: 'var(--bg-input)', padding: '0.1rem 0.6rem', borderRadius: '1rem', color: 'var(--text-primary)' }}>{columnProjects.length}</span>
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
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-accent)', fontSize: '0.75rem', fontWeight: 600 }}>
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
                        className={"status status-" + project.status.toLowerCase()}
                        style={{ fontSize: '0.7rem', padding: '0.1rem 0.3rem', cursor: 'pointer', outline: 'none' }}
                      >
                        {Object.entries(STATUS_LABELS).map(([val, label]) => (
                          <option key={val} value={val} style={{ color: 'inherit', background: 'var(--bg-main)' }}>{label}</option>
                        ))}
                      </select>
                    </div>

                    <h4 style={{ margin: '0 0 0.5rem', fontSize: '1.05rem', color: 'var(--text-primary)' }}>{project.name}</h4>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
                      <User size={14} /> {project.client?.name || 'Client inconnu'}
                    </div>

                    {project.description && (
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 1rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {project.description}
                      </p>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginTop: 'auto' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        <Briefcase size={12} /> {project.type}
                      </span>
                      <select 
                        value={project.priority}
                        onChange={(e) => { e.stopPropagation(); handlePriorityChange(project.id, e.target.value as Priority); }}
                        onClick={e => e.stopPropagation()}
                        style={{ fontSize: '0.7rem', padding: '0.1rem 0.3rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: PRIORITY_COLORS[project.priority], borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                      >
                        {Object.entries(PRIORITY_LABELS).map(([val, label]) => (
                          <option key={val} value={val} style={{ color: 'inherit', background: 'var(--bg-main)' }}>{label}</option>
                        ))}
                      </select>
                      {role === 'ADMIN' && (
                        <button className="ghost delete-btn" onClick={(e) => handleDelete(project.id, e)} style={{ padding: '0.2rem' }}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {hiddenProjects.length > 0 && (
                  <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 0.25rem 0.5rem', fontWeight: 600, textTransform: 'uppercase' }}>
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
                          background: 'var(--bg-card)', 
                          padding: '0.6rem 0.8rem', 
                          borderRadius: 'var(--radius-sm)', 
                          cursor: 'pointer', 
                          border: '1px solid var(--border-color)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '0.85rem',
                          transition: 'border-color var(--transition-fast)'
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.borderColor = 'var(--border-color-active)')}
                        onMouseOut={(e) => (e.currentTarget.style.borderColor = 'var(--border-color)')}
                      >
                        <span style={{ color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>
                          {project.name}
                        </span>
                        <span style={{ color: 'var(--text-accent)', fontSize: '0.7rem' }}>{project.reference}</span>
                      </div>
                    ))}
                  </div>
                )}
                
                {columnProjects.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.8rem', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
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
        <div className="mobile-backdrop" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }} onClick={() => setSelectedProject(null)}>
          <div className="card glass-card" style={{ width: '100%', maxWidth: '600px', padding: '2rem', maxHeight: '90dvh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div>
                <div style={{ color: 'var(--text-accent)', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                  <Hash size={16} /> {selectedProject.reference || 'PRJ-N/A'}
                </div>
                <h2 style={{ fontSize: '1.75rem', margin: 0 }}>{selectedProject.name}</h2>
              </div>
              <button className="ghost" onClick={() => setSelectedProject(null)} style={{ padding: '0.5rem' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem', padding: '1.5rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
              <div>
                <p style={{ margin: '0 0 0.3rem', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Client</p>
                <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{selectedProject.client?.name}</div>
                {selectedProject.client?.email && <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{selectedProject.client.email}</div>}
              </div>
              
              <div>
                <p style={{ margin: '0 0 0.3rem', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Interlocuteur</p>
                <div style={{ color: 'var(--text-primary)' }}>{selectedProject.client?.contact || 'N/A'}</div>
              </div>

              <div>
                <p style={{ margin: '0 0 0.3rem', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Partenaire</p>
                <div style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Layers size={14} /> {selectedProject.partner?.name || 'Aucun'}</div>
              </div>

              <div>
                <p style={{ margin: '0 0 0.3rem', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date de création</p>
                <div style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Calendar size={14} /> {new Date(selectedProject.createdAt).toLocaleDateString('fr-FR')}</div>
              </div>

              <div>
                <p style={{ margin: '0 0 0.3rem', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Priorité</p>
                <div style={{ color: PRIORITY_COLORS[selectedProject.priority], fontWeight: 600 }}>{PRIORITY_LABELS[selectedProject.priority]}</div>
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <p style={{ margin: '0 0 0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description détaillée</p>
              <div style={{ padding: '1.5rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: '0.95rem', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                {selectedProject.description || <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>Aucune description fournie.</span>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
