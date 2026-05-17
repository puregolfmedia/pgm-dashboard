export interface SessionUser {
  id: string
  username: string
  role: 'ADMIN' | 'CLIENT'
  clientId: string | null
  passwordResetRequired: boolean
}
