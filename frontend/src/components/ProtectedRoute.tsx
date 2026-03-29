import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { Lock } from 'lucide-react';

export function ProtectedRoute({ 
  children, 
  requiredPermission 
}: { 
  children: JSX.Element, 
  requiredPermission?: string 
}) {
  const { user } = useAuth();

  if (!user.id) {
    return <Navigate to="/login" replace />;
  }

  // Admins always have access; collaborators need explicit permission
  if (requiredPermission && user.role !== 'ADMIN' && !user.permissions.includes(requiredPermission)) {
    return (
      <div className="page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', gap: '1rem' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
          <Lock size={32} />
        </div>
        <h2 style={{ fontSize: '1.5rem', margin: 0, color: 'var(--text-primary)' }}>Accès Restreint</h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', lineHeight: '1.6' }}>
          Ce module est réservé aux associés et administrateurs. Si vous pensez que c'est une erreur, contactez votre administrateur afin d'obtenir les droits nécessaires.
        </p>
      </div>
    );
  }

  return children;
}
