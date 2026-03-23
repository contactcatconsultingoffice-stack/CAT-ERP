import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

export function ProtectedRoute({ 
  children, 
  requiredPermission 
}: { 
  children: JSX.Element, 
  requiredPermission?: string 
}) {
  const { token, role, permissions } = useAuth();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Admins always have access; collaborators need explicit permission
  if (requiredPermission && role !== 'ADMIN' && !permissions.includes(requiredPermission)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
