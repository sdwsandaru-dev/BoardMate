import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { api, fmtDay, lkr, prettyEnum, type PropertyAvailability, type PropertySummary, type Role, type University } from './api'
import { useAuth } from './auth'

// Room photos for marketing sections; listings use the owner's uploaded images.
// shortcut: hotlinked Unsplash photos, swap for files in /public before going to production.
export const PHOTOS = {
  room: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1400&q=75',
  room2: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=1200&q=75',
  students: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=75',
  city: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1800&q=75',
  stepFind: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=800&q=75',
  stepBook: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&w=800&q=75',
  stepMoveIn: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=75',
}

/** Loads data from the API; `reload` re-runs the request. */
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(!!path)
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (!path) return
    let alive = true
    setLoading(true)
    setError(null)
    api<T>(path)
      .then((d) => alive && setData(d))
      .catch((e: Error) => alive && setError(e.message))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [path, tick])
  const reload = useCallback(() => setTick((t) => t + 1), [])
  return { data, error, loading, reload }
}

// One shared request for the university directory; cleared on failure so the next use retries.
let universitiesRequest: Promise<University[]> | null = null

/** University directory for pickers. Loads once per visit and retries after a failure. */
export function useUniversities() {
  const [list, setList] = useState<University[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    universitiesRequest ??= api<{ universities: University[] }>('/profiles/universities?limit=100')
      .then((d) => d.universities)
      .catch((e: Error) => {
        universitiesRequest = null
        throw e
      })
    universitiesRequest
      .then(setList)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])
  useEffect(() => {
    load()
  }, [load])
  return { list, error, loading, retry: load }
}

/** Picker options for universities, with the city as a hint. */
export const universityOptions = (list: University[], emptyLabel: string) => [
  { value: '', label: emptyLabel },
  ...list.map((u) => ({ value: u.id, label: u.name, hint: u.city })),
]

const svg = (d: ReactNode, size = 'size-6') => (
  <svg viewBox="0 0 24 24" className={size} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {d}
  </svg>
)

export const Icon = {
  home: svg(<path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />),
  shield: svg(<><path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6z" /><path d="m8.5 12 2.5 2.5 4.5-5" /></>),
  people: svg(<><circle cx="9" cy="8" r="3.5" /><circle cx="17" cy="9" r="2.5" /><path d="M2.5 20c.5-3.6 3.2-6 6.5-6s6 2.4 6.5 6M15 14.3c3.2-.4 5.8 1.6 6.5 5.7" /></>),
  pin: svg(<><path d="M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z" /><circle cx="12" cy="9" r="2.5" /></>),
  cap: svg(<path d="m2 9 10-5 10 5-10 5zM6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5M22 9v6" />),
  bus: svg(<><rect x="5" y="3" width="14" height="15" rx="3" /><path d="M5 11h14M8 21v-3M16 21v-3" /></>),
  search: svg(<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>, 'size-5'),
  calendar: svg(<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>),
  key: svg(<><circle cx="8" cy="15" r="4" /><path d="m11 12 9-9M17 6l3 3" /></>),
  star: <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" /></svg>,
  check: svg(<path d="m5 12 4.5 4.5L19 7" />, 'size-4'),
  bed: svg(<path d="M3 18V6M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5M7 11.5a1.5 1.5 0 1 0 0-.01" />, 'size-5'),
  heart: (filled: boolean) => (
    <svg viewBox="0 0 24 24" className="size-5" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} aria-hidden>
      <path d="M12 20s-7.5-4.6-9.3-9.3C1.4 7.3 3.6 4 7 4c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.4 0 5.6 3.3 4.3 6.7C19.5 15.4 12 20 12 20z" strokeLinejoin="round" />
    </svg>
  ),
  bell: svg(<path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0" />, 'size-5'),
  chevron: svg(<path d="m6 9 6 6 6-6" />, 'size-4'),
  arrow: <span aria-hidden className="transition group-hover:translate-x-0.5">→</span>,
}

/** Decorative yellow sparkle strokes from the design. */
export const Sparkle = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 40 40" className={`pointer-events-none size-10 text-sun ${className}`} aria-hidden>
    <g stroke="currentColor" strokeWidth={4} strokeLinecap="round">
      <path d="M8 14 4 6M18 10l1-8M26 16l8-5" />
    </g>
  </svg>
)

/** Blue and yellow organic blobs from the design. */
export const Blob = ({ className = '', color = 'bg-sun' }: { className?: string; color?: string }) => (
  <div aria-hidden className={`pointer-events-none absolute rounded-[42%_58%_63%_37%/41%_44%_56%_59%] ${color} ${className}`} />
)

export function Headline({ lead, accent, className = '' }: { lead: ReactNode; accent: ReactNode; className?: string }) {
  return (
    <h2 className={`text-3xl font-extrabold leading-[1.1] tracking-tight text-balance sm:text-4xl ${className}`}>
      {lead} <br className="hidden sm:block" />
      <span className="underline-sun">{accent}</span>
    </h2>
  )
}

/** Section intro: eyebrow, headline, optional lede, optional right-side action. */
export function SectionHeader({ eyebrow, lead, accent, lede, action }: { eyebrow: string; lead: ReactNode; accent: ReactNode; lede?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
      <div className="max-w-2xl">
        <p className="eyebrow"><span className="h-0.5 w-6 rounded-full bg-sun" />{eyebrow}</p>
        <Headline lead={lead} accent={accent} className="mt-3" />
        {lede && <p className="mt-5 text-base leading-relaxed text-muted">{lede}</p>}
      </div>
      {action}
    </div>
  )
}

/** Top band for app pages (listings, dashboard, notifications). */
export function PageHeader({ eyebrow, title, accent, lede, action }: { eyebrow: string; title: ReactNode; accent: ReactNode; lede?: ReactNode; action?: ReactNode }) {
  return (
    <div className="relative overflow-hidden border-b border-line bg-white">
      <Blob className="-right-16 -top-20 size-56 opacity-90" />
      <Blob color="bg-brand" className="-right-4 top-24 size-16 opacity-90" />
      <div className="container-page relative flex flex-wrap items-end justify-between gap-6 py-10 sm:py-14">
        <div>
          <p className="eyebrow"><span className="h-0.5 w-6 rounded-full bg-sun" />{eyebrow}</p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
            {title} <span className="underline-sun">{accent}</span>
          </h1>
          {lede && <p className="mt-4 max-w-xl text-muted">{lede}</p>}
        </div>
        {action}
      </div>
    </div>
  )
}

/** Short availability line for a property, e.g. "2 of 3 rooms available" or "Fully booked from 1 Nov 2026". */
export function AvailabilityBadge({ a, className = '' }: { a: PropertyAvailability; className?: string }) {
  const [tone, text] = a.fullyBooked
    ? ['bg-red-50 text-red-700 ring-red-200', `Fully booked from ${fmtDay(a.bookedFrom!)}${a.nextAvailableFrom ? ` · free from ${fmtDay(a.nextAvailableFrom)}` : ''}`]
    : a.availableRooms < a.totalRooms
      ? ['bg-sun-50 text-yellow-800 ring-sun/40', `${a.availableRooms} of ${a.totalRooms} rooms available`]
      : ['bg-emerald-50 text-emerald-700 ring-emerald-200', a.totalRooms === 1 ? 'Available now' : `All ${a.totalRooms} rooms available`]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${tone} ${className}`}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {text}
    </span>
  )
}

export function PropertyCard({ p }: { p: PropertySummary }) {
  return (
    <Link to={`/properties/${p.id}`} className="card group flex flex-col overflow-hidden transition duration-300 hover:-translate-y-1 hover:shadow-lift">
      <div className="relative aspect-[4/3] overflow-hidden bg-brand-50">
        {p.images[0] ? (
          <img src={p.images[0].imageUrl} alt="" className="size-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
        ) : (
          <div className="grid size-full place-items-center text-brand/30">{Icon.home}</div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink/50 to-transparent" />
        <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-[11px] font-bold text-brand shadow-sm backdrop-blur">
          {prettyEnum(p.propertyType)}
        </span>
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-ink/70 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
          {Icon.check} Verified
        </span>
        <p className="absolute bottom-3 left-4 text-lg font-extrabold text-white drop-shadow">
          {lkr(p.monthlyRent)} <span className="text-xs font-medium text-white/80">/ month</span>
        </p>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="line-clamp-1 font-bold transition group-hover:text-brand">{p.title}</h3>
        <p className="mt-1 flex items-center gap-1 text-sm text-muted">
          <span className="text-brand [&_svg]:size-4">{Icon.pin}</span>
          {p.city}
        </p>
        {p.availability && <AvailabilityBadge a={p.availability} className="mt-3 self-start" />}
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted">{p.description}</p>
        <span className="mt-auto pt-4 text-sm font-bold text-brand">View details {Icon.arrow}</span>
      </div>
    </Link>
  )
}

export const CardSkeleton = ({ count = 3 }: { count?: number }) => (
  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading">
    {Array.from({ length: count }, (_, i) => (
      <div key={i} className="card overflow-hidden">
        <div className="aspect-[4/3] animate-pulse bg-black/5" />
        <div className="space-y-3 p-5">
          <div className="h-4 w-3/4 animate-pulse rounded bg-black/5" />
          <div className="h-3 w-1/3 animate-pulse rounded bg-black/5" />
          <div className="h-3 w-full animate-pulse rounded bg-black/5" />
        </div>
      </div>
    ))}
  </div>
)

export const Status = ({ value }: { value: string }) => {
  const tone: Record<string, string> = {
    PENDING: 'bg-sun-50 text-yellow-800 ring-sun/40',
    PENDING_APPROVAL: 'bg-sun-50 text-yellow-800 ring-sun/40',
    DRAFT: 'bg-black/[0.04] text-muted ring-black/10',
    CONFIRMED: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    APPROVED: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    PUBLISHED: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    ACTIVE: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    VERIFIED: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    REJECTED: 'bg-red-50 text-red-700 ring-red-200',
    CANCELLED: 'bg-black/[0.04] text-muted ring-black/10',
    SUSPENDED: 'bg-red-50 text-red-700 ring-red-200',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${tone[value] ?? 'bg-brand-50 text-brand ring-brand/20'}`}>
      <span className="size-1.5 rounded-full bg-current opacity-70" />
      {prettyEnum(value)}
    </span>
  )
}

export const Spinner = () => (
  <div className="flex justify-center py-16">
    <div className="size-8 animate-spin rounded-full border-4 border-brand/15 border-t-brand" role="status" aria-label="Loading" />
  </div>
)

export const ErrorBox = ({ msg }: { msg: string }) => (
  <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
    {msg}
  </p>
)

export const Empty = ({ children, icon = Icon.home }: { children: ReactNode; icon?: ReactNode }) => (
  <div className="flex flex-col items-center rounded-2xl border border-dashed border-line bg-white/60 px-6 py-12 text-center">
    <div className="grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand">{icon}</div>
    <p className="mt-4 max-w-sm text-sm text-muted">{children}</p>
  </div>
)

export const Avatar = ({ name, className = 'size-9 text-sm' }: { name: string; className?: string }) => (
  <span aria-hidden className={`grid shrink-0 place-items-center rounded-full bg-brand font-bold text-white ${className}`}>
    {name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
  </span>
)

export function RequireAuth({ roles }: { roles?: Role[] }) {
  const { user, loading, signedOut } = useAuth()
  const location = useLocation()
  if (loading) return <Spinner />
  if (!user) return signedOut ? <Navigate to="/" replace /> : <Navigate to="/login" state={{ from: location.pathname }} replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />
  return <Outlet />
}

export const Logo = ({ light = false }: { light?: boolean }) => (
  <span className={`flex items-center gap-2 text-xl font-extrabold tracking-tight ${light ? 'text-white' : ''}`}>
    <img src="/logo.svg" alt="" className="size-8" />
    <span>Board<span className={light ? 'text-sun' : 'text-brand'}>Mate</span></span>
  </span>
)

/** Log out from the menu and land on the home page. */
function useSignOut(logout: () => void) {
  const navigate = useNavigate()
  return () => {
    logout()
    navigate('/', { replace: true })
  }
}

function UserMenu() {
  const { user, logout } = useAuth()
  const signOut = useSignOut(logout)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])
  if (!user) return null
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} aria-label="Account menu" aria-expanded={open} aria-haspopup="menu" className="flex items-center gap-2 rounded-full border border-line bg-white py-1 pl-1 pr-3 transition hover:border-brand/40">
        <Avatar name={user.fullName} className="size-8 text-xs" />
        <span className="hidden text-sm font-semibold sm:inline">{user.fullName.split(' ')[0]}</span>
        <span className="text-muted">{Icon.chevron}</span>
      </button>
      {open && (
        <div role="menu" className="card absolute right-0 mt-2 w-60 animate-fade-up p-2">
          <div className="border-b border-line px-3 pb-3 pt-2">
            <p className="truncate text-sm font-bold">{user.fullName}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
            <p className="mt-2"><Status value={user.role} /></p>
          </div>
          {[['/dashboard', 'Dashboard'], ['/notifications', 'Notifications'], ['/listings', 'Browse listings']].map(([to, label]) => (
            <Link key={to} to={to} role="menuitem" onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 text-sm font-medium hover:bg-brand-50 hover:text-brand">
              {label}
            </Link>
          ))}
          <button role="menuitem" onClick={signOut} className="mt-1 w-full rounded-lg border-t border-line px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50">
            Log out
          </button>
        </div>
      )}
    </div>
  )
}

function Navbar() {
  const { user, logout } = useAuth()
  const signOut = useSignOut(logout)
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { pathname } = useLocation()
  const unread = useApi<{ unreadCount: number }>(user ? '/notifications/unread-count' : null)
  const reloadUnread = unread.reload
  // Refresh the badge on navigation, e.g. after reading notifications.
  useEffect(() => {
    if (user) reloadUnread()
  }, [pathname, user, reloadUnread])
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  const link = ({ isActive }: { isActive: boolean }) =>
    `relative px-3 py-2 text-sm font-semibold transition hover:text-brand ${isActive ? 'text-brand after:absolute after:inset-x-3 after:-bottom-[13px] after:h-0.5 after:rounded-full after:bg-brand' : 'text-ink/80'}`
  return (
    <header className={`sticky top-0 z-30 border-b transition ${scrolled ? 'border-line bg-white/85 shadow-soft backdrop-blur-lg' : 'border-transparent bg-cream'}`}>
      <nav className="container-page flex h-16 items-center gap-6">
        <Link to="/" aria-label="BoardMate home"><Logo /></Link>
        <div className="hidden items-center gap-1 md:flex">
          <NavLink to="/listings" className={link}>Browse</NavLink>
          {user && <NavLink to="/dashboard" className={link}>Dashboard</NavLink>}
          {!user && <Link to="/register?role=OWNER" className={link({ isActive: false })}>List your property</Link>}
        </div>
        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <>
              <Link to="/notifications" className="relative grid size-10 place-items-center rounded-full text-ink/80 transition hover:bg-brand-50 hover:text-brand" aria-label={`Notifications${unread.data?.unreadCount ? `, ${unread.data.unreadCount} unread` : ''}`}>
                {Icon.bell}
                {!!unread.data?.unreadCount && (
                  <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-sun px-1 text-[10px] font-extrabold leading-4 ring-2 ring-white">
                    {unread.data.unreadCount}
                  </span>
                )}
              </Link>
              <div className="hidden md:block"><UserMenu /></div>
            </>
          ) : (
            <>
              <Link to="/login" className="hidden px-3 text-sm font-semibold hover:text-brand sm:inline">Log in</Link>
              <Link to="/register" className="btn-sun">Get started</Link>
            </>
          )}
          <button className="grid size-10 place-items-center rounded-full hover:bg-brand-50 md:hidden" onClick={() => setOpen(!open)} aria-label="Menu" aria-expanded={open}>
            {svg(open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />)}
          </button>
        </div>
      </nav>
      {open && (
        <div className="container-page flex animate-fade-up flex-col gap-1 border-t border-line bg-white py-3 md:hidden">
          {user && (
            <div className="mb-2 flex items-center gap-3 rounded-xl bg-cream p-3">
              <Avatar name={user.fullName} />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{user.fullName}</p>
                <p className="truncate text-xs text-muted">{user.email}</p>
              </div>
            </div>
          )}
          <NavLink to="/listings" className="rounded-lg px-3 py-2.5 text-sm font-semibold hover:bg-brand-50">Browse listings</NavLink>
          {user ? (
            <>
              <NavLink to="/dashboard" className="rounded-lg px-3 py-2.5 text-sm font-semibold hover:bg-brand-50">Dashboard</NavLink>
              <NavLink to="/notifications" className="rounded-lg px-3 py-2.5 text-sm font-semibold hover:bg-brand-50">Notifications</NavLink>
              <button onClick={signOut} className="rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-red-600 hover:bg-red-50">Log out</button>
            </>
          ) : (
            <NavLink to="/login" className="rounded-lg px-3 py-2.5 text-sm font-semibold hover:bg-brand-50">Log in</NavLink>
          )}
        </div>
      )}
    </header>
  )
}

function Footer() {
  const { user } = useAuth()
  // Logged-in users get account links instead of sign-up and login links.
  const cols: [string, [string, string][]][] = user
    ? [
        ['Explore', [['/listings', 'Browse listings'], ['/', 'Home']]],
        ['Your account', [['/dashboard', 'Dashboard'], ['/notifications', 'Notifications']]],
      ]
    : [
        ['Students', [['/listings', 'Browse listings'], ['/register', 'Create an account'], ['/login', 'Log in']]],
        ['Owners', [['/register?role=OWNER', 'List your property'], ['/login', 'Owner login']]],
      ]
  return (
    <footer className="relative overflow-hidden bg-ink text-white/70">
      <Blob color="bg-brand" className="-right-24 -top-24 size-72 opacity-40" />
      <div className="container-page relative grid gap-10 py-14 md:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <Logo light />
          <p className="mt-4 max-w-xs text-sm leading-relaxed">Safe, affordable, student-friendly housing near campus. Every listing reviewed before it goes live.</p>
          <p className="mt-6 text-2xl font-extrabold leading-tight text-white">Find. Book. <span className="text-sun">Move In.</span></p>
        </div>
        {cols.map(([title, links]) => (
          <div key={title}>
            <p className="text-sm font-bold text-white">{title}</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              {links.map(([to, label]) => (
                <li key={label}><Link to={to} className="transition hover:text-sun">{label}</Link></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="container-page relative flex flex-wrap justify-between gap-2 border-t border-white/10 py-6 text-xs">
        <p>© {new Date().getFullYear()} BoardMate. All rights reserved.</p>
        <p>Your next chapter starts here.</p>
      </div>
    </footer>
  )
}

export function Layout() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:shadow-lift">
        Skip to content
      </a>
      <Navbar />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
