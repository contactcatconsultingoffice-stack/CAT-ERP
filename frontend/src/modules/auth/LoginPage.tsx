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
  const [is2FAPhase, setIs2FAPhase] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [preAuthToken, setPreAuthToken] = useState('');
  const [requiresSetup, setRequiresSetup] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [secret, setSecret] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post<any>('/auth/login', {
        email,
        password
      });

      if (res.requires2FASetup) {
        setPreAuthToken(res.preAuthToken);
        // Fetch setup details
        const setupData = await api.post<any>('/auth/2fa/setup', {
          preAuthToken: res.preAuthToken
        });
        setQrCodeUrl(setupData.qrCodeUrl);
        setSecret(setupData.secret);
        setRequiresSetup(true);
        setIs2FAPhase(true);
        setLoading(false);
        return;
      }

      if (res.requires2FA) {
        setIs2FAPhase(true);
        setRequiresSetup(false);
        setPreAuthToken(res.preAuthToken);
        setLoading(false);
        return;
      }

      login(res.user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Identifiants invalides.');
    } finally {
      setLoading(false);
    }
  };

  const handle2FALogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post<any>('/auth/2fa/login', {
        token: twoFactorCode,
        preAuthToken
      });
      login(res.user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Code 2FA invalide.');
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

        {!is2FAPhase ? (
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
        ) : (
          <form onSubmit={handle2FALogin} className="login-form">
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              {requiresSetup ? (
                <>
                  <p style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>
                    Configuration 2FA Obligatoire pour les Administrateurs
                  </p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                    Scannez le QR Code suivant avec votre application d'authentification (Google Authenticator, Authy, etc.).
                  </p>
                  <div style={{ background: '#fff', padding: '1rem', borderRadius: '12px', display: 'inline-block', marginBottom: '1rem' }}>
                    <img src={qrCodeUrl} alt="QR Code" style={{ width: '150px', height: '150px' }} />
                  </div>
                  <div style={{ marginBottom: '1rem', textAlign: 'left' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Code secret alternatif :</label>
                    <code style={{ display: 'block', padding: '0.5rem', background: 'var(--bg-main)', borderRadius: '6px', fontSize: '1rem', marginTop: '0.3rem', textAlign: 'center', letterSpacing: '0.1rem' }}>{secret}</code>
                  </div>
                </>
              ) : (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Vérification en deux étapes activée. Entrez le code généré par votre application d'authentification.
                </p>
              )}
            </div>
            <div className="form-group">
              <label htmlFor="2fa-code">Code de sécurité (6 chiffres)</label>
              <input
                id="2fa-code"
                type="text"
                maxLength={6}
                value={twoFactorCode}
                onChange={e => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                autoFocus
                required
                style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem' }}
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" className="btn-primary" disabled={loading || twoFactorCode.length !== 6}>
              {loading ? 'Vérification...' : (requiresSetup ? 'Vérifier et Activer' : 'Vérifier et se connecter')}
            </button>
            <button 
              type="button" 
              className="ghost" 
              onClick={() => { setIs2FAPhase(false); setRequiresSetup(false); }} 
              disabled={loading}
              style={{ width: '100%', marginTop: '0.5rem' }}
            >
              Retour
            </button>
          </form>
        )}

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

