import { useContext } from 'react';
import { AuthContext, AuthContextType } from '@/contexts/AuthContext';

/**
 * Hook that provides access to the authentication context.
 * Returns the current user, loading state, role booleans, and auth functions.
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
