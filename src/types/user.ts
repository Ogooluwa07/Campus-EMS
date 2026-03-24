export type UserRole = 'ADMIN' | 'ORGANIZER' | 'STUDENT'

export interface AppUser {
  uid: string
  fullName: string
  email: string
  role: UserRole
  department?: string
}
