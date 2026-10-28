// Thin fetch client for the BoardMate API. Types mirror the backend's Prisma selects.

const BASE = import.meta.env.VITE_API_URL ?? '/api/v1'
const TOKEN_KEY = 'boardmate_token'

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function api<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const headers = new Headers(init.headers)
  const token = tokenStore.get()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  let body = init.body
  if (init.json !== undefined) {
    headers.set('Content-Type', 'application/json')
    body = JSON.stringify(init.json)
  }
  const res = await fetch(BASE + path, { ...init, headers, body })
  const payload = await res.json().catch(() => ({}))
  if (!res.ok || payload.success === false) {
    // Access tokens last 15 minutes and there is no refresh endpoint.
    if (res.status === 401 && token) {
      tokenStore.clear()
      window.dispatchEvent(new Event('boardmate:logout'))
    }
    const detail = payload.errors?.map((e: { message: string }) => e.message).join(', ')
    throw new ApiError(detail || payload.message || `Request failed (${res.status})`, res.status)
  }
  return payload.data as T
}

export const qs = (params: Record<string, string | number | undefined>) => {
  const p = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => v !== undefined && v !== '' && p.set(k, String(v)))
  const s = p.toString()
  return s ? `?${s}` : ''
}

// Prisma Decimal fields arrive as strings.
export type Money = string | number
export const lkr = (v: Money | null | undefined) =>
  v == null ? '—' : `LKR ${Number(v).toLocaleString('en-LK', { maximumFractionDigits: 0 })}`

export type Role = 'STUDENT' | 'OWNER' | 'ADMIN'
export type User = { id: string; fullName: string; email: string; role: Role; phone?: string | null; status?: string }
export type AuthResult = { user: User; accessToken: string }

export const PROPERTY_TYPES = ['BOARDING_HOUSE', 'ANNEX', 'HOSTEL', 'APARTMENT', 'SHARED_ROOM', 'PRIVATE_ROOM'] as const
export type PropertyType = (typeof PROPERTY_TYPES)[number]
export const prettyEnum = (s: string) => s.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

/** Booking dates are calendar days stored as midnight UTC; format in UTC so they don't shift a day. */
export const fmtDay = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

export type Pagination = { page: number; limit: number; total: number; totalPages: number }

export type PropertySummary = {
  id: string
  title: string
  slug: string
  description: string
  propertyType: PropertyType
  city: string
  monthlyRent: Money
  securityDeposit: Money | null
  createdAt: string
  images: { imageUrl: string }[]
  availability?: PropertyAvailability
}

export type PropertyAvailability = {
  totalRooms: number
  availableRooms: number
  fullyBooked: boolean
  bookedFrom: string | null
  nextAvailableFrom: string | null
}

/** BOOKED: someone stays there today. AVAILABLE + bookedFrom: free until a stay starts. */
export type RoomAvailability = { state: 'AVAILABLE' | 'BOOKED'; bookedFrom: string | null; availableFrom: string | null }

/** A confirmed stay; until is the day the room is free again, null if open-ended. */
export type BookedPeriod = { from: string; until: string | null }

export type Photo = { id: string; imageUrl: string }

export type Room = { id: string; name: string; roomType: string; capacity: number; monthlyRent: Money; status: string; images?: Photo[]; availability?: RoomAvailability; bookedPeriods?: BookedPeriod[] }

export type PropertyDetail = Omit<PropertySummary, 'images'> & {
  address: string | null
  latitude: number | null
  longitude: number | null
  mapUrl: string | null
  owner: { id: string; fullName: string }
  rooms: Room[]
  images: { id: string; roomId: string | null; imageUrl: string; sortOrder: number }[]
  availability?: PropertyAvailability
}

export type Review = {
  id: string
  rating: number
  comment: string | null
  createdAt: string
  student: { id: string; fullName: string }
}
export type ReviewList = { averageRating: number; totalReviews: number; reviews: Review[] }

export type Booking = {
  id: string
  status: string
  moveInDate: string
  moveOutDate: string | null
  message: string | null
  createdAt: string
  property: { id: string; title: string; city: string }
  room: { id: string; name: string; roomType: string; monthlyRent: Money }
  student?: { id: string; fullName: string; email: string }
}

export type Favorite = {
  id: string
  property: {
    id: string
    title: string
    city: string
    monthlyRent: Money
    propertyType: PropertyType
    images: { imageUrl: string }[]
  }
}

export type Notification = {
  id: string
  type: string
  title: string
  message: string
  isRead: boolean
  createdAt: string
}

export type University = { id: string; name: string; city: string }

export type AdminDashboard = {
  users: { total: number; students: number; owners: number; suspended: number }
  properties: { total: number; pendingApproval: number; published: number; rejected: number; suspended: number }
  bookings: { total: number; pending: number; confirmed: number; rejected: number; cancelled: number }
}

export type PendingProperty = {
  id: string
  title: string
  city: string
  propertyType: PropertyType
  monthlyRent: Money
  verificationStatus: string
  createdAt: string
  owner: { fullName: string; email: string }
  images: { imageUrl: string }[]
}

export type AdminPropertyDetail = Omit<OwnerPropertyDetail, 'universityId'> & {
  address: string | null
  createdAt: string
  updatedAt: string
  owner: { id: string; fullName: string; email: string; phone: string | null; status: string; createdAt: string; ownerProfile: { verificationStatus: string } | null }
  university: { id: string; name: string; city: string } | null
}

export type OwnerProperty = {
  id: string
  title: string
  city: string
  propertyType: PropertyType
  monthlyRent: Money
  status: string
  verificationStatus: string
  images: { imageUrl: string }[]
  _count: { rooms: number; images: number }
  mapUrl: string | null
}

export type AdminUser =User & { status: string; createdAt: string }

/** One of the owner's own properties, any status, as returned by GET /properties/mine/:id. */
export type OwnerPropertyDetail = {
  id: string
  title: string
  description: string
  propertyType: PropertyType
  address: string | null
  city: string
  monthlyRent: Money
  securityDeposit: Money | null
  mapUrl: string | null
  universityId: string | null
  status: string
  verificationStatus: string
  rooms: (Room & { images: Photo[] })[]
  images: (Photo & { roomId: string | null })[]
}
