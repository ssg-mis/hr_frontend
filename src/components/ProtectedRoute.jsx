import { Navigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

/**
 * ProtectedRoute
 * @param {string[]} [allowedRoles] - Optional. If provided, user must have at least one of these roles.
 *   Uses case-insensitive matching against user.roles[].
 *   If omitted, any authenticated user can access the route.
 */
const ProtectedRoute = ({ children, allowedRoles }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);

  const isEmployeeOnly = useAuthStore((state) => state.isEmployeeOnly);
  const isCanteenManager = useAuthStore((state) => state.isCanteenManager);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const userRoles = user?.roles ?? (user?.role ? [user.role] : []);
    const hasAccess = allowedRoles.some((r) =>
      userRoles.some((ur) => ur.toLowerCase() === r.toLowerCase())
    );
    if (!hasAccess) {
      if (isEmployeeOnly) {
        return <Navigate to="/my-profile" replace />;
      }
      if (isCanteenManager) {
        return <Navigate to="/canteen" replace />;
      }
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;