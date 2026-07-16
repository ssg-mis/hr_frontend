import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

          set({
            isAuthenticated: true,
            user: userObj,
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
      };
    },
    {
      name: 'hr-fms-auth-storage',
    }
  )
);

export default useAuthStore;
