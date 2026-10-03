import { Navigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore';

/**
 * ProtectedRoute
 * Dynamically enforces page access configured by Admin via toggle switches.
 * @param {string[]} [allowedRoles] - Optional fallback role check.
 * @param {string} [pagePath] - Optional explicit path to check against hasPageAccess.
 */
const ProtectedRoute = ({ children, allowedRoles, pagePath }) => {
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const isAdmin = useAuthStore((state) => state.isAdmin);
  const hasPageAccess = useAuthStore((state) => state.hasPageAccess);

  const isEmployeeOnly = useAuthStore((state) => state.isEmployeeOnly);
  const isCanteenManager = useAuthStore((state) => state.isCanteenManager);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Admin has 100% full access to everything
  if (isAdmin) {
    return <>{children}</>;
  }

  // Dynamic page permission check
  const currentPath = pagePath || location.pathname;
  if (currentPath && currentPath !== '/' && !hasPageAccess(currentPath)) {
    if (isCanteenManager) {
      return <Navigate to="/canteen" replace />;
    }
    if (hasPageAccess('/my-profile')) {
      return <Navigate to="/my-profile" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  // If hitting root dashboard '/' but user does not have access to '/'
  if (currentPath === '/' && !hasPageAccess('/')) {
    if (hasPageAccess('/my-profile')) {
      return <Navigate to="/my-profile" replace />;
    }
    if (isCanteenManager) {
      return <Navigate to="/canteen" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;