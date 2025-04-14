import { defineStore } from 'pinia';
import axios from 'axios';
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';

interface User {
  id: number;
  username: string;
  email: string;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterCredentials {
  username: string;
  email: string;
  password: string;
}

export const useAuthStore = defineStore('auth', () => {
  const router = useRouter();
  const user = ref<User | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  
  // Try to restore user from localStorage
  const storedUser = localStorage.getItem('user');
  if (storedUser) {
    try {
      user.value = JSON.parse(storedUser);
    } catch (e) {
      localStorage.removeItem('user');
    }
  }
  
  const isAuthenticated = computed(() => !!user.value);
  
  // Fetch current user
  async function fetchUser() {
    try {
      loading.value = true;
      error.value = null;
      const response = await axios.get('/api/user');
      user.value = response.data;
      localStorage.setItem('user', JSON.stringify(response.data));
    } catch (err) {
      console.error('Failed to fetch user:', err);
      user.value = null;
      localStorage.removeItem('user');
    } finally {
      loading.value = false;
    }
  }
  
  // Login
  async function login(credentials: LoginCredentials) {
    try {
      loading.value = true;
      error.value = null;
      const response = await axios.post('/api/login', credentials);
      user.value = response.data;
      localStorage.setItem('user', JSON.stringify(response.data));
      router.push('/');
      return true;
    } catch (err: any) {
      console.error('Login failed:', err);
      error.value = err.response?.data?.message || 'Login failed';
      return false;
    } finally {
      loading.value = false;
    }
  }
  
  // Register
  async function register(credentials: RegisterCredentials) {
    try {
      loading.value = true;
      error.value = null;
      const response = await axios.post('/api/register', credentials);
      user.value = response.data;
      localStorage.setItem('user', JSON.stringify(response.data));
      router.push('/');
      return true;
    } catch (err: any) {
      console.error('Registration failed:', err);
      error.value = err.response?.data?.message || 'Registration failed';
      return false;
    } finally {
      loading.value = false;
    }
  }
  
  // Logout
  async function logout() {
    try {
      loading.value = true;
      error.value = null;
      await axios.post('/api/logout');
      user.value = null;
      localStorage.removeItem('user');
      router.push('/auth');
      return true;
    } catch (err: any) {
      console.error('Logout failed:', err);
      error.value = err.response?.data?.message || 'Logout failed';
      return false;
    } finally {
      loading.value = false;
    }
  }
  
  return {
    user,
    loading,
    error,
    isAuthenticated,
    fetchUser,
    login,
    register,
    logout
  };
});
