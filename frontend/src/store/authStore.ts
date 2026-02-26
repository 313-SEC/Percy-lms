import { create } from 'zustand'
import { authApi } from '../api/client'

interface AuthState {
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => boolean
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: Boolean(localStorage.getItem('access_token')),

  login: async (username, password) => {
    const res = await authApi.login(username, password)
    localStorage.setItem('access_token', res.data.access_token)
    localStorage.setItem('refresh_token', res.data.refresh_token)
    set({ isAuthenticated: true })
  },

  logout: async () => {
    const refreshToken = localStorage.getItem('refresh_token')
    if (refreshToken) {
      try { await authApi.logout(refreshToken) } catch {}
    }
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    set({ isAuthenticated: false })
  },

  checkAuth: () => Boolean(localStorage.getItem('access_token')),
}))
