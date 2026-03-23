import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem' }}>
      <h1 style={{ fontSize: '6rem', color: '#6366f1', margin: 0, fontWeight: 800 }}>404</h1>
      <h2 style={{ fontSize: '2rem', margin: '1rem 0', color: '#1e293b' }}>Page introuvable</h2>
      <p style={{ color: '#64748b', maxWidth: '400px', marginBottom: '2rem', lineHeight: '1.5' }}>
        La page que vous recherchez n'existe pas, a été déplacée ou vous n'avez pas l'autorisation d'y accéder.
      </p>
      <div style={{ display: 'flex', gap: '1rem' }}>
        <button onClick={() => window.history.back()} className="ghost" style={{ padding: '0.75rem 1.5rem', fontWeight: 600 }}>
          Retourner en arrière
        </button>
        <Link to="/dashboard" className="btn-primary" style={{ padding: '0.75rem 1.5rem', textDecoration: 'none', fontWeight: 600 }}>
          Aller au Dashboard
        </Link>
      </div>
    </div>
  );
}
