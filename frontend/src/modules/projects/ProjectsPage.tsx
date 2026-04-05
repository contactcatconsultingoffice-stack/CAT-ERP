import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../../api/client';
import { useAuth } from '../../auth/useAuth';
import {
  Plus,
  Edit3,
  Trash2,
  User,
  Briefcase,
  Layers,
  List,
  LayoutPanelTop,
  X,
  Calendar,
  Hash,
  FileText
} from 'lucide-react';
import { ExportButtons } from '../../components/ExportButtons';
import { useToast } from '../../components/Toast';
import { CommentsPanel } from '../../components/CommentsPanel';
type ProjectStatus = 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD';
type ProjectType = 'STRATEGIE' | 'GESTION' | 'DEVELOPPEMENT' | 'TECH';
type Priority = 'LOW' | 'MEDIUM' | 'HIGH';

type Project = {
  id: string;
  reference: string | null;
  name: string;
  type: ProjectType;
  subType: string | null;
  status: ProjectStatus;
  priority: Priority;
  clientId: string;
  partnerId: string | null;
  description?: string | null;
  contact?: string | null;
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

const TYPE_LABELS: Record<ProjectType, string> = {
  STRATEGIE: 'Analyse Stratégique & Marché',
  GESTION: 'Gestion & Pilotage de Projet',
  DEVELOPPEMENT: 'Développement & Innovation',
  TECH: 'Solutions Techniques & Digital'
};

const SUBTYPES: Record<ProjectType, string[]> = {
  STRATEGIE: [
    'Étude de Marché & Analyse Concurrentielle',
    'Business Model & Business Plan',
    'Audit de Performance & Diagnostic'
  ],
  GESTION: [
    'Assistance à Maîtrise d\'Ouvrage (AMO)',
    'Accompagnement au Changement',
    'Mise en place de PMO'
  ],
  DEVELOPPEMENT: [
    'Stratégie de Croissance (Go-to-market)',
    'Innovation de Modèle Économique',
    'Validation de Concept (MVP)'
  ],
  TECH: [
    'Développement de Sites Web (Vitrine, E-commerce, SaaS, CRM)',
    'Applications Mobiles & Logicielles',
    'Branding & Identité Visuelle (Logos)',
    'Marketing Digital & SEO',
    'Solutions IA & Automatisation'
  ]
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
  const { user } = useAuth();
  const role = user?.role;
  const { showToast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [clients, setClients] = useState<ClientRef[]>([]);
  const [partners, setPartners] = useState<PartnerRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'BOARD' | 'LIST'>('BOARD');

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState<ProjectType>('STRATEGIE');
  const [subType, setSubType] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('PLANNING');
  const [priority, setPriority] = useState<Priority>('MEDIUM');
  const [clientId, setClientId] = useState('');
  const [partnerId, setPartnerId] = useState('');
  const [contact, setContact] = useState('');
  const [description, setDescription] = useState('');

  // Update subType when type changes
  useEffect(() => {
    setSubType(SUBTYPES[type][0]);
  }, [type]);

  const load = async (reset = false) => {
    try {
      const targetPage = reset ? 1 : page;
      if (reset) {
        setLoading(true);
        setPage(1);
      } else {
        setLoadingMore(true);
      }

      const query = `/projects?page=${targetPage}&limit=${limit}&search=${encodeURIComponent(search)}`;
      const [projRes, cls, parts] = await Promise.all([
        api.get<{ data: Project[], totalCount: number }>(query),
        api.get<{ data: ClientRef[] }>('/clients'),
        api.get<{ data: PartnerRef[] }>('/partners')
      ]);

      const newProjects = projRes.data || [];
      if (reset) {
        setProjects(newProjects);
      } else {
        setProjects(prev => [...prev, ...newProjects]);
      }

      setTotalCount(projRes.totalCount || 0);
      setClients(Array.isArray(cls) ? cls : (cls.data ?? []));
      setPartners(Array.isArray(parts) ? parts : (parts.data ?? []));
    } catch (err) {
      console.error(err);
      showToast('Erreur lors du chargement des projets', 'error');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    void load(true);
  }, [search]); // Reload when search changes

  const loadMore = () => {
    setPage(prev => prev + 1);
  };

  useEffect(() => {
    if (page > 1) {
      void load(false);
    }
  }, [page]);

  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const openEditModal = (p: Project) => {
    setIsEditing(true);
    setEditId(p.id);
    setName(p.name);
    setType(p.type);
    setSubType(p.subType || '');
    setStatus(p.status);
    setPriority(p.priority);
    setClientId(p.clientId);
    setPartnerId(p.partnerId || '');
    setContact(p.contact || '');
    setDescription(p.description || '');
    setShowAddModal(true);
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditId(null);
    setName('');
    setDescription('');
    setClientId('');
    setPartnerId('');
    setContact('');
    setShowAddModal(false);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !clientId) return;
    setIsSubmitting(true);
    try {
      if (isEditing && editId) {
        await api.put(`/projects/${editId}`, { name, type, subType, status, priority, clientId, partnerId: partnerId || null, description, contact });
        showToast('Projet mis à jour !', 'success');
      } else {
        await api.post('/projects', { name, type, subType, status, priority, clientId, partnerId: partnerId || null, description, contact });
        showToast('Projet créé avec succès !', 'success');
      }
      resetForm();
      void load(true);
    } catch (err) {
      showToast('Erreur lors de l’opération.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Voulez-vous vraiment supprimer ce projet ?")) return;
    try {
      await api.delete(`/projects/${id}`);
      showToast('Projet supprimé.', 'success');
      if (selectedProject?.id === id) setSelectedProject(null);
      void load(true);
    } catch {
      showToast('Erreur lors de la suppression.', 'error');
    }
  };

  const handleStatusChange = async (id: string, newStatus: ProjectStatus) => {
    try {
      await api.put(`/projects/${id}`, { status: newStatus });
      showToast('Statut mis à jour !', 'success');
      void load(true);
    } catch {
      showToast('Erreur mise à jour statut.', 'error');
    }
  };

  const handlePriorityChange = async (id: string, newPriority: Priority) => {
    try {
      await api.put(`/projects/${id}`, { priority: newPriority });
      showToast('Priorité mise à jour !', 'success');
      void load(true);
    } catch {
      showToast('Erreur mise à jour priorité.', 'error');
    }
  };

  const handleExportPDF = async () => {
    try {
      const blob = await api.getBlob('/projects/export/pdf');
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'liste_projets.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      showToast('Erreur lors de l’export PDF.', 'error');
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
        <p>Vue unifiée : Kanban pour le suivi temps-réel et liste pour la lecture rapide.</p>
      </header>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div className="segmented" style={{ display: 'flex', background: 'var(--bg-input)', borderRadius: '12px', padding: '0.3rem', border: '1px solid var(--border-color)' }}>
            <button
              className={`ghost ${viewMode === 'BOARD' ? 'active' : ''}`}
              onClick={() => setViewMode('BOARD')}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', borderRadius: '10px',
                fontWeight: 600, fontSize: '0.9rem',
                background: viewMode === 'BOARD' ? 'var(--accent-primary)' : 'transparent',
                color: viewMode === 'BOARD' ? '#fff' : 'var(--text-secondary)'
              }}
            >
              <LayoutPanelTop size={18} /> Kanban Board
            </button>
            <button
              className={`ghost ${viewMode === 'LIST' ? 'active' : ''}`}
              onClick={() => setViewMode('LIST')}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', borderRadius: '10px',
                fontWeight: 600, fontSize: '0.9rem',
                background: viewMode === 'LIST' ? 'var(--accent-primary)' : 'transparent',
                color: viewMode === 'LIST' ? '#fff' : 'var(--text-secondary)'
              }}
            >
              <List size={18} /> Project List
            </button>
          </div>

          <div className="search-box" style={{ width: '320px' }}>
            <input
              type="text"
              placeholder="Search projects, clients or refs..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ borderRadius: '12px' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
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
          <button
            className="ghost"
            onClick={handleExportPDF}
            style={{ borderRadius: '10px', padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 600 }}
          >
            <FileText size={18} /> Export PDF
          </button>
          {role === 'ADMIN' && (
            <button className="btn-primary" onClick={() => { resetForm(); setShowAddModal(true); }} style={{ borderRadius: '10px', padding: '0.7rem 1.2rem' }}>
              <Plus size={18} /> New Project
            </button>
          )}
        </div>
      </div>
      {showAddModal && (
        <section className="card glass-card" style={{ marginBottom: '2rem' }}>
          <h2>{isEditing ? 'Modifier le projet' : 'Créer un nouveau projet'}</h2>
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
              Domaine d'intervention *
              <select value={type} onChange={e => setType(e.target.value as ProjectType)} required>
                {Object.entries(TYPE_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </label>
            <label>
              Sous-type de prestation *
              <select value={subType} onChange={e => setSubType(e.target.value)} required>
                {SUBTYPES[type].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
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
            <label>
              Contact (interlocuteur)
              <input value={contact} onChange={e => setContact(e.target.value)} placeholder="Nom du contact" />
            </label>
            <label style={{ gridColumn: '1 / -1' }}>
              Description détaillée
              <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Objectifs, spécifications..." rows={3} />
            </label>
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button type="submit" className="btn-primary" disabled={isSubmitting} style={{ width: 'fit-content', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {isSubmitting && <Plus size={18} className="animate-spin" />}
                {isSubmitting ? 'Traitement...' : isEditing ? 'Sauvegarder les modifications' : 'Générer le projet (Réf auto)'}
              </button>
              <button type="button" className="ghost" onClick={resetForm} disabled={isSubmitting}>Annuler</button>
            </div>
          </form>
        </section>
      )}

      {viewMode === 'LIST' && (
        <div className="card" style={{ padding: '1.25rem', marginBottom: '2rem', overflowX: 'auto' }}>
          <table className="table" style={{ minWidth: '840px' }}>
            <thead>
              <tr>
                <th>Réf</th>
                <th>Projet</th>
                <th>Client</th>
                <th>Statut</th>
                <th>Priorité</th>
                <th>Type</th>
                <th>Créé</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} onClick={() => setSelectedProject(p)} style={{ cursor: 'pointer' }}>
                  <td style={{ color: 'var(--text-accent)', fontWeight: 600 }}>{p.reference || 'PRJ-N/A'}</td>
                  <td>{p.name}</td>
                  <td>{p.client?.name || 'Client inconnu'}</td>
                  <td>
                    <select
                      value={p.status}
                      onClick={e => e.stopPropagation()}
                      onChange={e => handleStatusChange(p.id, e.target.value as ProjectStatus)}
                      className={"status status-" + p.status.toLowerCase()}
                      style={{ fontSize: '0.8rem' }}
                    >
                      {Object.entries(STATUS_LABELS).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      value={p.priority}
                      onClick={e => e.stopPropagation()}
                      onChange={e => handlePriorityChange(p.id, e.target.value as Priority)}
                      style={{ fontSize: '0.8rem', color: PRIORITY_COLORS[p.priority], background: 'var(--bg-input)' }}
                    >
                      {Object.entries(PRIORITY_LABELS).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                  </td>
                  <td>{TYPE_LABELS[p.type]}</td>
                  <td>{new Date(p.createdAt).toLocaleDateString('fr-FR')}</td>
                  <td style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                    <button className="ghost" onClick={(e) => { e.stopPropagation(); openEditModal(p); setSelectedProject(null); }}>
                      <Edit3 size={14} />
                    </button>
                    {role === 'ADMIN' && (
                      <button className="ghost delete-btn" onClick={(e) => handleDelete(p.id, e)}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {viewMode === 'BOARD' && (
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
                          <div style={{ display: 'flex', gap: '0.3rem' }}>
                            <button className="ghost" onClick={(e) => { e.stopPropagation(); openEditModal(project); }} style={{ padding: '0.2rem' }} title="Modifier">
                              <Edit3 size={14} />
                            </button>
                            <button className="ghost delete-btn" onClick={(e) => handleDelete(project.id, e)} style={{ padding: '0.2rem' }}>
                              <Trash2 size={14} />
                            </button>
                          </div>
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
                          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                            <span style={{ color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {project.name}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{TYPE_LABELS[project.type]}</span>
                              {project.subType && <span style={{ fontSize: '0.65rem', color: 'var(--accent-primary)', fontWeight: 600 }}>? {project.subType}</span>}
                            </div>
                          </div>
                          <span style={{ color: 'var(--text-accent)', fontSize: '0.7rem', flexShrink: 0 }}>{project.reference}</span>
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
      )}

      {/* Pagination / Load More */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2.5rem', marginBottom: '3rem' }}>
        {projects.length < totalCount && (
          <button
            className="btn-primary"
            onClick={loadMore}
            disabled={loadingMore}
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.8rem 2rem', borderRadius: '12px' }}
          >
            {loadingMore ? 'Chargement...' : `Afficher plus de projets (${projects.length} / ${totalCount})`}
            {!loadingMore && <Plus size={18} />}
          </button>
        )}
        {projects.length >= totalCount && totalCount > 0 && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Tous les projets ont été chargés ({totalCount})</p>
        )}
      </div>

      {/* Project Details Modal */}
      {selectedProject && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(8, 13, 20, 0.72)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1.5rem',
          }}
          onClick={() => setSelectedProject(null)}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="card"
            style={{
              width: '100%',
              maxWidth: '980px',
              maxHeight: '88vh',
              padding: 0,
              display: 'flex',
              flexDirection: 'column',
              borderRadius: '20px',
              border: '1px solid var(--border-color-active)',
              boxShadow: '0 24px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(79,111,255,0.08)',
              overflow: 'hidden',
              background: 'var(--bg-main)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ padding: '1.5rem 2rem', background: 'var(--bg-main)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ padding: '0.75rem', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-primary)', borderRadius: '12px' }}>
                  <Briefcase size={24} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-accent)', letterSpacing: '0.05em' }}>{selectedProject.reference || 'PRJ-N/A'}</span>
                    <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--text-muted)' }}></span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{TYPE_LABELS[selectedProject.type]}</span>
                  </div>
                  <h2 style={{ fontSize: '1.5rem', margin: 0, fontWeight: 700 }}>{selectedProject.name}</h2>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {role === 'ADMIN' && (
                  <button className="ghost" onClick={() => { openEditModal(selectedProject); setSelectedProject(null); }} style={{ padding: '0.5rem', borderRadius: '8px' }} title="Edit">
                    <Edit3 size={20} />
                  </button>
                )}
                <button className="ghost" onClick={() => setSelectedProject(null)} style={{ padding: '0.5rem', borderRadius: '8px' }}>
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', flex: 1, overflow: 'hidden' }}>
              {/* Left Column: Details & Comments */}
              <div style={{ padding: '2rem', overflowY: 'auto', borderRight: '1px solid var(--border-color)' }}>
                <section style={{ marginBottom: '2.5rem' }}>
                  <h4 style={{ fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1rem', letterSpacing: '0.05em', fontWeight: 600 }}>Description du projet</h4>
                  <div style={{ color: 'var(--text-primary)', fontSize: '1rem', lineHeight: '1.7', whiteSpace: 'pre-wrap', background: 'var(--bg-main)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                    {selectedProject.description || <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>Aucune description détaillée.</span>}
                  </div>
                </section>

                <section>
                  <h4 style={{ fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1rem', letterSpacing: '0.05em', fontWeight: 600 }}>Fil d'actualité & Commentaires</h4>
                  <CommentsPanel entityType="PROJECT" entityId={selectedProject.id} />
                </section>
              </div>

              {/* Right Column: Metadata & Controls */}
              <div style={{ padding: '1.75rem', background: 'var(--bg-sidebar)', overflowY: 'auto' }}>
                <div style={{ display: 'grid', gap: '1.5rem' }}>
                  <div>
                    <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.75rem', fontWeight: 600 }}>Statut & Priorité</h4>
                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                      <select
                        value={selectedProject.status}
                        onChange={(e) => handleStatusChange(selectedProject.id, e.target.value as ProjectStatus)}
                        style={{ width: '100%', padding: '0.6rem', borderRadius: '10px', background: 'var(--bg-main)', border: '1px solid var(--border-color)', fontSize: '0.9rem' }}
                      >
                        {Object.entries(STATUS_LABELS).map(([val, label]) => (
                          <option key={val} value={val}>{label}</option>
                        ))}
                      </select>
                      <select
                        value={selectedProject.priority}
                        onChange={(e) => handlePriorityChange(selectedProject.id, e.target.value as Priority)}
                        style={{ width: '100%', padding: '0.6rem', borderRadius: '10px', background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: PRIORITY_COLORS[selectedProject.priority], fontWeight: 600, fontSize: '0.9rem' }}
                      >
                        {Object.entries(PRIORITY_LABELS).map(([val, label]) => (
                          <option key={val} value={val}>{label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-main)', padding: '1.25rem', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                    <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1rem', fontWeight: 600 }}>Informations Clientes</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ padding: '0.5rem', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-primary)', borderRadius: '8px' }}><User size={18} /></div>
                        <div>
                          <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>{selectedProject.client?.name}</p>
                          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Client Principal</p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ padding: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '8px' }}><Hash size={18} /></div>
                        <div>
                          <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>{selectedProject.contact || 'N/A'}</p>
                          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Interlocuteur</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-main)', padding: '1.25rem', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                    <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1rem', fontWeight: 600 }}>Partenariat</h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ padding: '0.5rem', background: 'rgba(236, 72, 153, 0.1)', color: '#ec4899', borderRadius: '8px' }}><Layers size={18} /></div>
                      <div>
                        <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>{selectedProject.partner?.name || 'Aucun partenaire'}</p>
                      </div>
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-main)', padding: '1.25rem', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                    <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1rem', fontWeight: 600 }}>Dates Clés</h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ padding: '0.5rem', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', borderRadius: '8px' }}><Calendar size={18} /></div>
                      <div>
                        <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>{new Date(selectedProject.createdAt).toLocaleDateString('fr-FR')}</p>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Création du projet</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
