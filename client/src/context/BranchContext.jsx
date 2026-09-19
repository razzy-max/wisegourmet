import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { branchApi } from '../api/branchApi';

const BranchContext = createContext(null);

// Single source of truth for "is branching turned on, and what are the
// active branches" — fetched once from the server (an admin-toggleable DB
// setting, not a build-time env var). Customers never pick a branch
// themselves (see the unified-menu design); this is used for admin/staff
// branch-name lookups (AdminNavBar, StaffNavBar, AdminMenuManagerPage) and
// by the checkout flow to resolve delivery zones/pickup options.
export function BranchProvider({ children }) {
  const [state, setState] = useState({ loading: true, enabled: false, branches: [] });

  const load = useCallback(async () => {
    try {
      const response = await branchApi.list();
      setState({
        loading: false,
        enabled: Boolean(response.branchingEnabled),
        branches: response.branches || [],
      });
    } catch {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return <BranchContext.Provider value={{ ...state, refresh: load }}>{children}</BranchContext.Provider>;
}

export function useBranch() {
  const context = useContext(BranchContext);
  if (!context) {
    throw new Error('useBranch must be used within BranchProvider');
  }
  return context;
}
