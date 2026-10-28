import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, tokenStore, type AuthResult, type User } from './api'

type AuthCtx = {
  user: User | null
  loading: boolean
  /** True after the user logged out on purpose, false after a session expiry. */
  signedOut: boolean
  login: (email: string, password: string) => Promise<User>
  register: (input: { fullName: string; email: string; password: string; phone?: string; role: 'STUDENT' | 'OWNER' }) => Promise<User>
  logout: () => void
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(!!tokenStore.get())
  const [signedOut, setSignedOut] = useState(false)

  // Session expired or token rejected: protected pages send people to log in again.
  const expire = useCallback(() => {
    tokenStore.clear()
    setSignedOut(false)
    setUser(null)
  }, [])

  // The user chose to log out: protected pages send them home.
  const logout = useCallback(() => {
    tokenStore.clear()
    setSignedOut(true)
    setUser(null)
  }, [])

  useEffect(() => {
    window.addEventListener('boardmate:logout', expire)
    if (tokenStore.get()) {
      api<{ user: User }>('/auth/me')
        .then((d) => setUser(d.user))
        .catch(expire)
        .finally(() => setLoading(false))
    }
    return () => window.removeEventListener('boardmate:logout', expire)
  }, [expire])

  const accept = (d: AuthResult) => {
    tokenStore.set(d.accessToken)
    setSignedOut(false)
    setUser(d.user)
    return d.user
  }

  const value: AuthCtx = {
    user,
    loading,
    signedOut,
    logout,
    login: (email, password) => api<AuthResult>('/auth/login', { method: 'POST', json: { email, password } }).then(accept),
    register: (input) => api<AuthResult>('/auth/register', { method: 'POST', json: input }).then(accept),
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
