// Re-export from the canonical location. useAuth is now backed by AuthContext
// so all callers share one getSession() + one fetchUserProfile() call.
export { useAuth } from '@/contexts/AuthContext';
