export interface Event {
  id: string
  title: string
  description: string
  category: string
  location: string
  startTime?: unknown
  endTime?: unknown
  capacity: number
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
  organizerId: string
  registrationCount?: number
}
