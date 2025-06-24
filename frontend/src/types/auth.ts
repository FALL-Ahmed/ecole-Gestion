
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'professor' | 'student';
  avatar?: string;
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}
