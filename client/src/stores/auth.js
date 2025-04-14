import { defineStore } from 'pinia'
import axios from 'axios'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    loading: false,
    error: null
  }),
  
  getters: {
    isAuthenticated: (state) => !!state.user,
    getUser: (state) => state.user
  },
  
  actions: {
    async fetchUser() {
      try {
        this.loading = true
        const response = await axios.get('/api/user')
        this.user = response.data
        return response.data
      } catch (error) {
        this.error = error
        return null
      } finally {
        this.loading = false
      }
    },
    
    async login(credentials) {
      try {
        this.loading = true
        const response = await axios.post('/api/login', credentials)
        this.user = response.data
        return response.data
      } catch (error) {
        this.error = error.response?.data || 'Login failed'
        throw error
      } finally {
        this.loading = false
      }
    },
    
    async register(userData) {
      try {
        this.loading = true
        const response = await axios.post('/api/register', userData)
        this.user = response.data
        return response.data
      } catch (error) {
        this.error = error.response?.data || 'Registration failed'
        throw error
      } finally {
        this.loading = false
      }
    },
    
    async logout() {
      try {
        this.loading = true
        await axios.post('/api/logout')
        this.user = null
      } catch (error) {
        this.error = error.response?.data || 'Logout failed'
        throw error
      } finally {
        this.loading = false
      }
    }
  }
})