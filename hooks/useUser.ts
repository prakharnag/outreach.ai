import { useAuth } from '../contexts/auth-context';

export function useUser() {
  const { user, loading } = useAuth();
  return { user, loading };
}