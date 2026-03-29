import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../auth/useAuth';
import { motion } from 'framer-motion';
import type { Role } from '../../auth/AuthContext';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('contact.catconsultingoffice@gmail.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post<{ 
        user: { id: string, name: string, email: string, role: Role, isSuperAdmin: boolean, permissions: string[] } 
      }>('/auth/login', {
        email,
        password
      });
      login(res.user);
      navigate('/dashboard');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Identifiants invalides. Veuillez réessayer.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <motion.div 
        className="login-card glass"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="login-header">
          <div className="logo" style={{ 
            width: '80px', 
            height: '80px', 
            margin: '0 auto 1.5rem', 
            borderRadius: '50%', 
            background: 'var(--bg-main)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--border-color)'
          }}>
            <img src="/logo.png" alt="CAT ERP" style={{ width: '64px', height: '64px', borderRadius: '50%' }} />
          </div>
          <h1>Bienvenue</h1>
          <p>Connectez-vous à votre interface CAT ERP</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="votre@email.com"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Mot de passe</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <div className="login-footer" style={{ marginTop: '2rem', textAlign: 'center' }}>
          <button 
            type="button" 
            className="ghost" 
            onClick={() => navigate('/forgot-password')}
            style={{ fontSize: '0.85rem', border: 'none' }}
          >
            Mot de passe oublié ?
          </button>
        </div>
      </motion.div>
    </div>
  );
}

