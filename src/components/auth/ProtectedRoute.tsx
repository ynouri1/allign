import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

type AllowedRole = 'admin' | 'practitioner' | 'patient';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: AllowedRole[];
  redirectTo?: string;
}

export function ProtectedRoute({ children, allowedRoles, redirectTo = '/auth' }: ProtectedRouteProps) {
  const { user, loading, isAdmin, isPractitioner, isPatient } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Non connecté → page de connexion
  if (!user) {
    return <Navigate to={redirectTo} replace />;
  }

  // Vérifier si l'utilisateur a un des rôles autorisés
  const hasAccess = allowedRoles.some(role => {
    switch (role) {
      case 'admin': return isAdmin;
      case 'practitioner': return isPractitioner;
      case 'patient': return isPatient;
      default: return false;
    }
  });

  if (!hasAccess) {
    // Rediriger vers le dashboard approprié selon le rôle
    if (isPatient) {
      return <Navigate to="/patient" replace />;
    }
    if (isPractitioner) {
      return <Navigate to="/practitioner-new" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
