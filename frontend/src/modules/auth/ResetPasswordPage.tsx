import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import { useToast } from '../../components/Toast';

export function ResetPasswordPage() {
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const email = searchParams.get('email') || '';
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.post('/reset-password', { email, token, newPassword: password });
      showToast('Mot de passe réinitialisé !', 'success');
      navigate('/login');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Lien invalide ou expiré."
      );
    } finally {
      setLoading(false);
    }
  };

  if (!email || !token) {
    return (
      <div className="login-page">
        <div className="login-card glass">
          <header className="login-header">
            <div className="logo" style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <img src="/logo.png" alt="CAT ERP" style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(255,255,255,0.15)', boxShadow: '0 8px 16px rgba(0,0,0,0.2)' }} />
            </div>
            <h1>Lien invalide</h1>
            <p>Le lien de réinitialisation est incomplet ou invalide.</p>
          </header>
          <button onClick={() => navigate('/login')} className="btn-primary">Retour à la connexion</button>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-card glass">
        <header className="login-header">
          <div className="logo" style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <img src="/logo.png" alt="CAT ERP" style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(255,255,255,0.15)', boxShadow: '0 8px 16px rgba(0,0,0,0.2)' }} />
          </div>
          <h1>Nouveau mot de passe</h1>
          <p>Choisissez votre nouveau mot de passe pour {email}.</p>
        </header>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="password">Nouveau mot de passe</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirmer le mot de passe</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Mise à jour…' : 'Changer mon mot de passe'}
          </button>
        </form>
        
        {error && <div className="error-message">{error}</div>}
      </div>
    </div>
  );
}
