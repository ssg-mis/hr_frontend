import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getDefaultPagesForRole } from '../data/pagePermissions';

const useAuthStore = create(
  persist(
    (set, get) => {
      // Sync initial state directly with localStorage to prevent auth loss on reload
      let initialUser = null;
      let initialAuth = false;
      let isAdmin = false;
      let isHR = false;
      let isHOD = false;
      let isEmployeeOnly = false;
      let isCanteenManager = false;

      try {
        const userStr = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        if (userStr && token) {
          initialUser = JSON.parse(userStr);
          initialAuth = true;
          
          const roles = (initialUser.roles || []).map(r => r.toLowerCase().replace(/[^a-z0-9]/g, ""));
          isAdmin = roles.includes('admin');
          isHR = roles.includes('hr');
          isHOD = roles.includes('hod');
          isCanteenManager = roles.includes('canteenmanager');
          isEmployeeOnly = roles.includes('employee') &&
            !isHR &&
            !isHOD &&
            !isAdmin &&
            !isCanteenManager;
        }
      } catch (e) {
        console.error("Failed to load initial auth state from localStorage:", e);
      }

      return {
        isAuthenticated: initialAuth,
        user: initialUser,
        isAdmin,
        isHR,
        isHOD,
        isEmployeeOnly,
        isCanteenManager,

        login: (userObj) => {
          const roles = (userObj?.roles || []).map(r => r.toLowerCase().replace(/[^a-z0-9]/g, ""));
          const isAdmin = roles.includes('admin');
          const isHR = roles.includes('hr');
          const isHOD = roles.includes('hod');
          const isCanteenManager = roles.includes('canteenmanager');
          const isEmployeeOnly = roles.includes('employee') &&
            !isHR &&
            !isHOD &&
            !isAdmin &&
            !isCanteenManager;

          // Normalize allowedPages
          const allowedPages = userObj?.allowedPages || userObj?.allowed_pages || [];
          const normalizedUser = { ...userObj, allowedPages, allowed_pages: allowedPages };

          set({
            isAuthenticated: true,
            user: normalizedUser,
            isAdmin,
            isHR,
            isHOD,
            isEmployeeOnly,
            isCanteenManager,
          });
        },

        logout: () => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          set({
            isAuthenticated: false,
            user: null,
            isAdmin: false,
            isHR: false,
            isHOD: false,
            isEmployeeOnly: false,
            isCanteenManager: false,
          });
        },

        // ─── Role helpers ─────────────────────────────────────────────────────────

        /** Returns true if the current user has the given role */
        hasRole: (role) => {
          const user = get().user;
          const userRoles = (user?.roles || []).map(r => r.toLowerCase().replace(/[^a-z0-9]/g, ""));
          const targetRole = role.toLowerCase().replace(/[^a-z0-9]/g, "");
          return userRoles.includes(targetRole);
        },

        /** Returns true if the current user has access to the specified page path */
        hasPageAccess: (path) => {
          const state = get();
          if (!state.isAuthenticated || !state.user) return false;
          // Admin has access to all pages
          if (state.isAdmin) return true;

          const user = state.user;
          const userAllowedPages = user.allowedPages || user.allowed_pages;

          // If custom allowedPages array is set on user record
          if (Array.isArray(userAllowedPages) && userAllowedPages.length > 0) {
            return userAllowedPages.includes(path);
          }

          // Fallback to role presets
          const role = user.role || (user.roles && user.roles[0]) || 'Employee';
          const defaultPages = getDefaultPagesForRole(role);
          return defaultPages.includes(path);
        },

        setUserAllowedPages: (allowedPages) => {
          const currentUser = get().user;
          if (currentUser) {
            const updated = { ...currentUser, allowedPages, allowed_pages: allowedPages };
            try {
              localStorage.setItem('user', JSON.stringify(updated));
            } catch (e) {
              console.error('Failed to sync updated user to localStorage:', e);
            }
            set({ user: updated });
          }
        },
      };
    },
    {
      name: 'hr-fms-auth-storage',
    }
  )
);

export default useAuthStore;
