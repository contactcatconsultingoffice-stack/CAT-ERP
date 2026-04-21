import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await api.post<{ message: string }>('/auth/forgot-password', { email });
      setMessage(res.message);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Une erreur est survenue. Veuillez réessayer."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card glass">
        <header className="login-header">
          <div className="logo">CAT ERP</div>
          <h1>Mot de passe oublié</h1>
          <p>Saisissez votre email pour recevoir un lien de réinitialisation.</p>
        </header>

        {message ? (
          <div className="success-message" style={{ textAlign: 'center' }}>
            <p>{message}</p>
            <Link to="/login" className="btn-primary" style={{ display: 'inline-block', marginTop: '1rem', textDecoration: 'none' }}>
              Retour à la connexion
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="login-form">
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

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Envoi en cours…' : 'Envoyer le lien'}
            </button>
            
            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <Link to="/login" style={{ color: '#818cf8', fontSize: '0.9rem', textDecoration: 'none' }}>
                Retour à la connexion
              </Link>
            </div>
          </form>
        )}
        
        {error && <div className="error-message">{error}</div>}
      </div>
    </div>
  );
}
