import type { Timestamp } from 'firebase/firestore'

export interface Event {
  id: string
  title: string
  description: string
  category: string
  location: string
  startTime?: Timestamp | null
  endTime?: Timestamp | null
  capacity: number
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
  organizerId: string
  registrationCount?: number
}

