import { useEffect, useState } from 'react';
import axios from 'axios';

type User = {
  id: string;
  email: string;
  displayName: string;
  admin: boolean;
  createdAt: Date;
};

type UseMeResult = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  error: string;
  refresh: () => Promise<void>;
};

export function useMe(): UseMeResult {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  async function refresh() {
    setIsLoading(true);
    setError('');

    try {
      const response = await axios.get('/api/me');
      setUser(response.data);
    } catch (err: unknown) {
      setUser(null);
      if (axios.isAxiosError<{ message?: string }>(err)) {
        setError(err.response?.data?.message ?? '');
      } else {
        setError('');
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.admin || false,
    error,
    refresh,
  };
}
