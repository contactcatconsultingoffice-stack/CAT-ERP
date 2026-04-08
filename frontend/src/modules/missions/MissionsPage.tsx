import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../auth/useAuth';
import { Trash2, Loader2 } from 'lucide-react';
import { useToast } from '../../components/Toast';

type Mission = {
  id: string;
  projectId: string;
  collaboratorId: string;
  description: string;
  hours: number;
  performedAt: string;
  project: { id: string; name: string };
  collaborator: { 
    id: string; 
    user: { name: string | null; email: string } 
  };
};

export function MissionsPage() {
  const { user } = useAuth();
  const role = user?.role;
  const { showToast } = useToast();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [projects, setProjects] = useState<{id: string, name: string}[]>([]);
  const [collaborators, setCollaborators] = useState<{id: string, name: string}[]>([]);
  
  const [search, setSearch] = useState('');
  const [projectIdFilter, setProjectIdFilter] = useState('ALL');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [projectId, setProjectId] = useState('');
  const [collaboratorId, setCollaboratorId] = useState('');
  const [description, setDescription] = useState('');
  const [hours, setHours] = useState('');
  const [performedAt, setPerformedAt] = useState('');

  const load = useCallback(async () => {
    try {
      const [missRes, projRes, collRes] = await Promise.all([
        api.get<{ data: Mission[] }>('/missions'),
        api.get<{ data: {id: string, name: string}[] }>('/projects'),
        api.get<{ data: any[] }>('/collaborators')
      ]);

      const miss = Array.isArray(missRes) ? missRes : (missRes.data ?? []);
      const proj = Array.isArray(projRes) ? projRes : (projRes.data ?? []);
      const fallbackCollabs = Array.isArray(collRes) ? collRes : (collRes.data ?? []);

      setMissions(miss);
      setProjects(proj);
      
      if (fallbackCollabs) {
        setCollaborators(fallbackCollabs.map(c => ({
          id: c.id,
          name: c.user?.name || c.user?.email || 'Collaborateur'
        })));
      }
    } catch (err) {
      console.error('[MissionsPage] Failed to load data:', err);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredMissions = missions.filter(m => {
    const s = search.toLowerCase();
    const matchesSearch = (m.description || '').toLowerCase().includes(s) ||
      (m.collaborator?.user?.name || '').toLowerCase().includes(s);
    const matchesProject = projectIdFilter === 'ALL' || m.projectId === projectIdFilter;
    return matchesSearch && matchesProject;
  });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("DEBUG: handleAdd Mission called");
    if (!projectId || !collaboratorId || !description || !hours) {
      showToast("Veuillez remplir tous les champs obligatoires.", "warning");
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post('/missions', {
        projectId,
        collaboratorId,
        description,
        hours: parseFloat(hours),
        performedAt: performedAt ? new Date(performedAt).toISOString() : new Date().toISOString()
      });
      showToast('Mission enregistrée !', 'success');
      setDescription('');
      setHours('');
      void load();
    } catch (err) {
      showToast('Erreur lors de l’enregistrement de la mission.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Voulez-vous vraiment supprimer cette mission ?")) return;
    try {
      await api.delete(`/missions/${id}`);
      showToast('Mission supprimée.', 'success');
      void load();
    } catch {
      showToast('Erreur lors de la suppression.', 'error');
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1>Missions</h1>
        <p>Suivi du temps et des interventions.</p>
      </header>

      <section className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h2>Liste des missions</h2>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input 
              type="text" 
              placeholder="Rechercher par collaborateur, projet..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd', width: '200px' }}
            />
            <select 
              value={projectIdFilter} 
              onChange={e => setProjectIdFilter(e.target.value)}
              style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
            >
              <option value="ALL">Tous les projets</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="table-responsive">
          <table className="lines-table">
            <thead>
              <tr>
                <th>Projet</th>
                <th>Collaborateur</th>
                <th>Description</th>
                <th>Heures</th>
                <th>Date</th>
                {role === 'ADMIN' && <th style={{ width: 60 }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredMissions.map(m => (
                <tr key={m.id}>
                  <td>{m.project?.name || 'N/A'}</td>
                  <td>{m.collaborator?.user?.name || m.collaborator?.user?.email || 'N/A'}</td>
                  <td>{m.description}</td>
                  <td>{m.hours}</td>
                  <td>{new Date(m.performedAt).toLocaleDateString()}</td>
                  {role === 'ADMIN' && (
                    <td>
                      <button type="button" className="ghost" onClick={() => handleDelete(m.id)} style={{ padding: '0.2rem', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#f87171' }}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {filteredMissions.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>
                    Aucune mission trouvée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {role === 'ADMIN' && (
        <section className="card">
          <h2>Ajouter une mission</h2>
          <form onSubmit={handleAdd} className="form-grid">
            <label>
              Projet *
              <select value={projectId} onChange={e => setProjectId(e.target.value)} required>
                <option value="">Choisir un projet...</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            <label>
              Collaborateur *
              <select value={collaboratorId} onChange={e => setCollaboratorId(e.target.value)} required>
                <option value="">Choisir un collaborateur...</option>
                {collaborators.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label>
              Description *
              <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Tâches effectuées..." required />
            </label>
            <label>
              Heures *
              <input type="number" step="0.5" value={hours} onChange={e => setHours(e.target.value)} placeholder="Ex: 3.5" required />
            </label>
            <label>
              Date
              <input type="date" value={performedAt} onChange={e => setPerformedAt(e.target.value)} />
            </label>
            <div style={{ marginTop: '1rem' }}>
              <button type="submit" className="btn-primary" disabled={isSubmitting} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                {isSubmitting ? 'Enregistrement...' : 'Enregistrer la mission'}
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
