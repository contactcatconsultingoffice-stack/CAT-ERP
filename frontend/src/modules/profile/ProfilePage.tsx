import { useAuth } from '../../auth/useAuth';
import { motion } from 'framer-motion';
import { Shield, Key, Mail, LogOut, AlertTriangle, ArrowRight, CheckCircle } from 'lucide-react';
import { TwoFactorSetup } from '../../components/TwoFactorSetup';
import { useNavigate } from 'react-router-dom';

export function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <div className="page" style={{ maxWidth: '900px', margin: '0 auto' }}>
      <header className="page-header" style={{ marginBottom: '2rem' }}>
        <h1>Mon Profil</h1>
        <p>Gérez vos informations personnelles et paramètres de sécurité.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) minmax(350px, 1.5fr)', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* Colonne gauche : Informations */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="card" style={{ padding: '2rem', textAlign: 'center' }}>
            <div style={{ 
              width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.1)', 
              color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', 
              fontSize: '2rem', fontWeight: 'bold', margin: '0 auto 1.5rem',
              border: '2px solid rgba(99, 102, 241, 0.3)'
            }}>
              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{user.name || 'Utilisateur'}</h2>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              <Mail size={16} /> {user.email}
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8', borderRadius: '2rem', fontSize: '0.85rem', fontWeight: 600 }}>
              <Shield size={16} />
              {user.isSuperAdmin ? 'SUPER ADMIN' : user.role === 'ADMIN' ? 'ASSOCIÉ (ADMIN)' : 'COLLABORATEUR'}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Key size={18} /> Vos permissions
            </h3>
            {user.isSuperAdmin ? (
              <div style={{ padding: '1rem', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', borderRadius: '0.75rem', fontSize: '0.9rem' }}>
                Vous disposez d'un accès illimité à l'intégralité du système.
              </div>
            ) : user.permissions && user.permissions.length > 0 ? (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {user.permissions.map(p => (
                  <li key={p} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: 'var(--bg-main)', borderRadius: '0.5rem', color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                    <CheckCircle size={16} color="#22c55e" /> Accès au module {p.charAt(0).toUpperCase() + p.slice(1)}
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Aucune permission spécifique n'a été configurée pour votre compte par les administrateurs.</p>
            )}
          </motion.div>
          
          <button className="btn-primary" onClick={logout} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'transparent', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444' }}>
            <LogOut size={18} /> Se déconnecter
          </button>
        </div>

        {/* Colonne droite : Sécurité & Admin */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <TwoFactorSetup />
          </motion.div>

          {(user.isSuperAdmin || user.role === 'ADMIN') && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card" style={{ padding: '1.5rem', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
              <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f59e0b' }}>
                <AlertTriangle size={18} /> Espace Administration
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                En tant qu'administrateur, vous disposez des droits nécessaires pour créer de nouveaux comptes, réinitialiser des mots de passe, et modifier l'accès des collaborateurs.
              </p>
              <button 
                className="btn-primary" 
                onClick={() => navigate('/users')}
                style={{ width: '100%', background: '#f59e0b', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                Gérer les accès du personnel <ArrowRight size={18} />
              </button>
            </motion.div>
          )}
          
        </div>
      </div>
    </div>
  );
}
