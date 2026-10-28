import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import {
  api,
  lkr,
  prettyEnum,
  type AdminDashboard,
  type AdminUser,
  type Booking,
  type Favorite,
  type Pagination,
  type OwnerProperty,
  type PendingProperty,
} from '../api'
import { useAuth } from '../auth'
import { Avatar, Empty, ErrorBox, Icon, PageHeader, Spinner, Status, useApi } from '../components'

export default function Dashboard() {
  const { user } = useAuth()
  const first = user!.fullName.split(' ')[0]
  const lede = {
    STUDENT: 'Track your booking requests and the places you have saved.',
    OWNER: 'Manage your listings and respond to booking requests.',
    ADMIN: 'Review listings, monitor activity and manage accounts.',
  }[user!.role]
  return (
    <>
      <PageHeader
        eyebrow={`${prettyEnum(user!.role)} dashboard`}
        title={`Hi ${first},`}
        accent={user!.role === 'ADMIN' ? 'Admin Console' : 'Welcome Home'}
        lede={lede}
        action={user!.role === 'STUDENT' ? <Link to="/listings" className="btn-sun group">Find a place {Icon.arrow}</Link> : undefined}
      />
      <div className="container-page space-y-14 py-10">
        {user!.role === 'STUDENT' && <StudentDashboard />}
        {user!.role === 'OWNER' && <OwnerDashboard />}
        {user!.role === 'ADMIN' && <AdminDashboardView />}
      </div>
    </>
  )
}

const Section = ({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode }) => (
  <section>
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-xl font-extrabold tracking-tight">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
    {children}
  </section>
)

const count = (bookings: Booking[] | null, status: string) => bookings?.filter((b) => b.status === status).length ?? 0

/** Runs a mutation, then reloads; errors surface as an alert. */
const act = (fn: () => Promise<unknown>, reload: () => void) => () =>
  fn().then(reload, (e: Error) => alert(e.message))

const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString() : '—')

function BookingTable({ bookings, renderActions, showStudent }: { bookings: Booking[]; renderActions: (b: Booking) => ReactNode; showStudent?: boolean }) {
  if (!bookings.length) return <Empty icon={Icon.calendar}>No bookings yet.</Empty>
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[680px] text-left text-sm">
        <thead className="border-b border-line bg-cream/60 text-xs font-semibold uppercase tracking-wider text-muted">
          <tr>
            <th className="px-5 py-3.5">Property</th>
            {showStudent && <th className="px-5 py-3.5">Student</th>}
            <th className="px-5 py-3.5">Room</th>
            <th className="px-5 py-3.5">Move in</th>
            <th className="px-5 py-3.5">Status</th>
            <th className="px-5 py-3.5"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line [&_td]:px-5 [&_td]:py-4">
          {bookings.map((b) => (
            <tr key={b.id} className="transition hover:bg-cream/50">
              <td>
                <Link to={`/properties/${b.property.id}`} className="font-bold hover:text-brand">{b.property.title}</Link>
                <p className="text-xs text-muted">{b.property.city}</p>
              </td>
              {showStudent && (
                <td>
                  <div className="flex items-center gap-3">
                    <Avatar name={b.student?.fullName ?? '?'} className="size-8 text-xs" />
                    <div>
                      <p className="font-semibold">{b.student?.fullName}</p>
                      <p className="text-xs text-muted">{b.student?.email}</p>
                    </div>
                  </div>
                </td>
              )}
              <td>
                {b.room.name}
                <p className="text-xs text-muted">{lkr(b.room.monthlyRent)}</p>
              </td>
              <td>{fmtDate(b.moveInDate)}</td>
              <td><Status value={b.status} /></td>
              <td className="text-right">{b.status === 'PENDING' && renderActions(b)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function StudentDashboard() {
  const bookings = useApi<Booking[]>('/bookings/my')
  const favs = useApi<{ favorites: Favorite[] }>('/favorites')
  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total bookings" value={bookings.data?.length ?? 0} icon={Icon.calendar} />
        <Stat label="Awaiting reply" value={count(bookings.data, 'PENDING')} icon={Icon.bell} tone="sun" />
        <Stat label="Confirmed" value={count(bookings.data, 'CONFIRMED')} icon={Icon.key} />
        <Stat label="Saved places" value={favs.data?.favorites.length ?? 0} icon={Icon.heart(false)} />
      </div>
      <Section title="My bookings" subtitle="Requests you have sent to property owners.">
        {bookings.loading ? <Spinner /> : bookings.error ? <ErrorBox msg={bookings.error} /> : (
          <BookingTable
            bookings={bookings.data ?? []}
            renderActions={(b) => (
              <button className="btn-ghost !py-1.5" onClick={act(() => api(`/bookings/${b.id}/cancel`, { method: 'PATCH' }), bookings.reload)}>Cancel</button>
            )}
          />
        )}
      </Section>
      <Section title="Saved places" subtitle="Listings you have marked with the heart.">
        {favs.loading ? <Spinner /> : favs.data?.favorites.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {favs.data.favorites.map(({ id, property: p }) => (
              <div key={id} className="card flex items-center gap-4 p-3 transition hover:shadow-lift">
                <div className="size-20 shrink-0 overflow-hidden rounded-xl bg-brand-50">
                  {p.images[0] && <img src={p.images[0].imageUrl} alt="" className="size-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <Link to={`/properties/${p.id}`} className="line-clamp-1 font-bold hover:text-brand">{p.title}</Link>
                  <p className="text-xs text-muted">{p.city} · {prettyEnum(p.propertyType)}</p>
                  <p className="mt-1 text-sm font-extrabold text-brand">{lkr(p.monthlyRent)}</p>
                </div>
                <button aria-label="Remove from favorites" className="rounded-full p-2 text-brand hover:bg-brand-50" onClick={act(() => api(`/favorites/${p.id}`, { method: 'DELETE' }), favs.reload)}>
                  {Icon.heart(true)}
                </button>
              </div>
            ))}
          </div>
        ) : <Empty icon={Icon.heart(false)}>{favs.error ?? 'Tap the heart on any listing to save it here.'}</Empty>}
      </Section>
    </>
  )
}

/* ---------------------------- Owner ---------------------------- */

function OwnerDashboard() {
  const bookings = useApi<Booking[]>('/bookings/owner')
  const mine = useApi<{ properties: OwnerProperty[] }>('/properties/mine')
  const [deleting, setDeleting] = useState<OwnerProperty | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  return (
    <>
      {notice && (
        <p role="status" className="mb-6 flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          {Icon.check} {notice}
        </p>
      )}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Properties" value={mine.data?.properties.length ?? 0} icon={Icon.home} />
        <Stat label="Published" value={mine.data?.properties.filter((p) => p.status === 'PUBLISHED').length ?? 0} icon={Icon.shield} />
        <Stat label="New requests" value={count(bookings.data, 'PENDING')} icon={Icon.bell} tone="sun" />
        <Stat label="Confirmed bookings" value={count(bookings.data, 'CONFIRMED')} icon={Icon.key} />
      </div>
      <Section
        title="My properties"
        subtitle="Each property holds its rooms and photos. Open one to edit it or finish setting it up."
        action={<Link to="/dashboard/properties/new" className="btn-sun">+ Add property</Link>}
      >
        {mine.loading && !mine.data ? <Spinner /> : mine.error ? <ErrorBox msg={mine.error} /> : mine.data?.properties.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {mine.data.properties.map((p) => <OwnerPropertyCard key={p.id} property={p} onDelete={() => setDeleting(p)} />)}
          </div>
        ) : (
          <Empty icon={Icon.home}>
            Add your first property. You'll enter its details, its rooms with photos, and then submit it for approval.
          </Empty>
        )}
      </Section>
      {deleting && (
        <DeletePropertyDialog
          property={deleting}
          onClose={() => setDeleting(null)}
          onDone={() => {
            setNotice(`"${deleting.title}" was deleted. The admin team has been told why.`)
            setDeleting(null)
            mine.reload()
          }}
        />
      )}
      <Section title="Booking requests" subtitle="Approve or reject requests from students.">
        {bookings.loading ? <Spinner /> : bookings.error ? <ErrorBox msg={bookings.error} /> : (
          <BookingTable
            showStudent
            bookings={bookings.data ?? []}
            renderActions={(b) => (
              <div className="flex justify-end gap-2">
                <button className="btn-brand !py-1.5" onClick={act(() => api(`/bookings/${b.id}/approve`, { method: 'PATCH' }), bookings.reload)}>Approve</button>
                <button className="btn-ghost !py-1.5" onClick={act(() => api(`/bookings/${b.id}/reject`, { method: 'PATCH' }), bookings.reload)}>Reject</button>
              </div>
            )}
          />
        )}
      </Section>
    </>
  )
}

/** Summary of one property with its next step. */
function OwnerPropertyCard({ property: p, onDelete }: { property: OwnerProperty; onDelete: () => void }) {
  const editor = `/dashboard/properties/${p.id}`
  const draft = p.status === 'DRAFT' || p.status === 'REJECTED'
  const next = !p._count.rooms ? ['rooms', 'Add rooms'] : !p._count.images ? ['photos', 'Add photos'] : draft ? ['review', 'Review and submit'] : ['details', 'Edit']
  return (
    <article className="card flex gap-4 p-4 transition hover:shadow-lift">
      <Link to={editor} className="size-24 shrink-0 overflow-hidden rounded-xl bg-brand-50" tabIndex={-1} aria-hidden>
        {p.images[0] ? <img src={p.images[0].imageUrl} alt="" className="size-full object-cover" /> : <span className="grid size-full place-items-center text-brand/30">{Icon.home}</span>}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <Link to={editor} className="line-clamp-1 font-bold hover:text-brand">{p.title}</Link>
          <Status value={p.status} />
        </div>
        <p className="mt-1 text-xs text-muted">{p.city} · {lkr(p.monthlyRent)}/mo</p>
        <p className="mt-2 flex gap-3 text-xs font-semibold">
          <span className={p._count.rooms ? 'text-ink' : 'text-red-600'}>{p._count.rooms} room{p._count.rooms === 1 ? '' : 's'}</span>
          <span className={p._count.images ? 'text-ink' : 'text-red-600'}>{p._count.images} photo{p._count.images === 1 ? '' : 's'}</span>
          {p.mapUrl && <span className="text-emerald-700">Map ✓</span>}
        </p>
        <div className="mt-auto flex items-center gap-3 pt-3">
          <Link to={`${editor}?step=${next[0]}`} className={`${draft ? 'btn-sun' : 'btn-ghost'} !px-4 !py-1.5`}>{next[1]}</Link>
          {p.status === 'PUBLISHED' && <Link to={`/properties/${p.id}`} className="text-sm font-semibold text-brand hover:underline">View listing</Link>}
          <button type="button" onClick={onDelete} className="ml-auto text-sm font-semibold text-muted transition hover:text-red-600">Delete</button>
        </div>
      </div>
    </article>
  )
}

/* ---------------------------- Admin ---------------------------- */

function Stat({ label, value, icon, tone = 'brand' }: { label: string; value: number; icon: ReactNode; tone?: 'brand' | 'sun' }) {
  return (
    <div className="card flex items-center gap-4 p-5">
      <span className={`grid size-12 shrink-0 place-items-center rounded-2xl [&_svg]:size-6 ${tone === 'sun' ? 'bg-sun-50 text-yellow-700' : 'bg-brand-50 text-brand'}`}>{icon}</span>
      <div className="min-w-0">
        <p className="text-2xl font-extrabold leading-none tracking-tight sm:text-3xl">{value}</p>
        <p className="mt-1.5 truncate text-xs font-semibold text-muted">{label}</p>
      </div>
    </div>
  )
}

function AdminDashboardView() {
  const stats = useApi<AdminDashboard>('/admin/dashboard')
  const pending = useApi<{ properties: PendingProperty[]; pagination: Pagination }>('/admin/properties/pending')
  const [search, setSearch] = useState('')
  const users = useApi<{ users: AdminUser[]; pagination: Pagination }>(`/admin/users${search ? `?search=${encodeURIComponent(search)}` : ''}`)
  const refresh = () => {
    stats.reload()
    pending.reload()
    users.reload()
  }
  const s = stats.data
  return (
    <>
      {s && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label="Users" value={s.users.total} icon={Icon.people} />
          <Stat label="Published listings" value={s.properties.published} icon={Icon.shield} />
          <Stat label="Awaiting approval" value={s.properties.pendingApproval} icon={Icon.home} tone="sun" />
          <Stat label="Pending bookings" value={s.bookings.pending} icon={Icon.calendar} />
        </div>
      )}
      {stats.error && <ErrorBox msg={stats.error} />}

      <Section title="Properties awaiting approval" subtitle="Open a listing to check its details, then verify and approve it.">
        {pending.loading ? <Spinner /> : pending.data?.properties.length ? (
          <div className="space-y-3">
            {pending.data.properties.map((p) => (
              <Link key={p.id} to={`/dashboard/review/${p.id}`} className="card group flex flex-wrap items-center gap-4 p-4 transition hover:border-brand/30 hover:shadow-lift">
                <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-brand-50">
                  {p.images[0] && <img src={p.images[0].imageUrl} alt="" className="size-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold group-hover:text-brand">{p.title}</p>
                  <p className="text-xs text-muted">{p.city} · {prettyEnum(p.propertyType)} · {lkr(p.monthlyRent)} · by {p.owner.fullName}</p>
                </div>
                <Status value={p.verificationStatus} />
                <span className="btn-brand !py-1.5">Review {Icon.arrow}</span>
              </Link>
            ))}
          </div>
        ) : <Empty icon={Icon.shield}>{pending.error ?? 'Nothing waiting for review. All caught up.'}</Empty>}
      </Section>

      <Section
        title="Users"
        subtitle="Search, suspend or reactivate accounts."
        action={
          <form onSubmit={(e) => { e.preventDefault(); setSearch(String(new FormData(e.currentTarget).get('q') ?? '')) }}>
            <label className="relative block"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">{Icon.search}</span><input name="q" placeholder="Search users" aria-label="Search users" className="input !w-64 !pl-10" /></label>
          </form>
        }
      >
        {users.loading ? <Spinner /> : users.error ? <ErrorBox msg={users.error} /> : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-line bg-cream/60 text-xs font-semibold uppercase tracking-wider text-muted">
                <tr><th className="p-4">User</th><th className="p-4">Role</th><th className="p-4">Status</th><th className="p-4"><span className="sr-only">Actions</span></th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {users.data?.users.map((u) => (
                  <tr key={u.id} className="transition hover:bg-cream/50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.fullName} className="size-9 text-xs" />
                        <div>
                          <p className="font-bold">{u.fullName}</p>
                          <p className="text-xs text-muted">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">{prettyEnum(u.role)}</td>
                    <td className="p-4"><Status value={u.status} /></td>
                    <td className="p-4 text-right">
                      {u.role !== 'ADMIN' && (u.status === 'ACTIVE' ? (
                        <button className="btn-ghost !py-1.5" onClick={act(() => api(`/admin/users/${u.id}/suspend`, { method: 'PATCH' }), refresh)}>Suspend</button>
                      ) : (
                        <button className="btn-brand !py-1.5" onClick={act(() => api(`/admin/users/${u.id}/reactivate`, { method: 'PATCH' }), refresh)}>Reactivate</button>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </>
  )
}

export function RejectDialog({ property, onClose, onDone }: { property: { id: string; title: string; owner: { fullName: string } }; onClose: () => void; onDone: () => void }) {
  return (
    <ReasonDialog
      title="Reject listing"
      subtitle={`${property.title} · by ${property.owner.fullName}`}
      label="Reason for rejection"
      placeholder="e.g. Photos don't show the rooms clearly. Please add photos of each room and the bathroom."
      hint="The owner sees this in their notifications, so say what to fix."
      minLength={5}
      submitLabel="Reject listing"
      busyLabel="Rejecting…"
      onClose={onClose}
      onSubmit={async (reason) => {
        await api(`/admin/properties/${property.id}/reject`, { method: 'PATCH', json: { reason } })
        onDone()
      }}
    />
  )
}

function DeletePropertyDialog({ property, onClose, onDone }: { property: OwnerProperty; onClose: () => void; onDone: () => void }) {
  return (
    <ReasonDialog
      title="Delete property"
      subtitle={`${property.title} · ${property.city}`}
      label="Why are you deleting this listing?"
      placeholder="e.g. The house has been sold, or all rooms are now let long-term."
      hint="The admin team receives this reason."
      notice="This removes the listing with its rooms and photos, and students will no longer see it. If students booked or reviewed it before, it is archived instead so their records stay."
      minLength={10}
      submitLabel="Delete property"
      busyLabel="Deleting…"
      onClose={onClose}
      onSubmit={async (reason) => {
        await api(`/properties/${property.id}`, { method: 'DELETE', json: { reason } })
        onDone()
      }}
    />
  )
}

/** Modal that asks for a written reason before a destructive action. */
function ReasonDialog({ title, subtitle, label, placeholder, hint, notice, minLength, submitLabel, busyLabel, onClose, onSubmit }: {
  title: string
  subtitle: string
  label: string
  placeholder: string
  hint: string
  notice?: string
  minLength: number
  submitLabel: string
  busyLabel: string
  onClose: () => void
  onSubmit: (reason: string) => Promise<void>
}) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const length = reason.trim().length
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, busy])
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await onSubmit(reason.trim())
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }
  // Portal: the dashboard's animated wrapper would otherwise clip the fixed overlay.
  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="reason-title" onClick={() => !busy && onClose()}>
      <form className="card w-full max-w-lg animate-fade-up overflow-hidden" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="flex items-start justify-between gap-4 border-b border-line p-6">
          <div className="min-w-0">
            <h2 id="reason-title" className="text-xl font-extrabold">{title}</h2>
            <p className="mt-1 truncate text-sm text-muted">{subtitle}</p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close" className="grid size-9 shrink-0 place-items-center rounded-full text-muted hover:bg-black/5">✕</button>
        </div>
        <div className="space-y-4 p-6">
          {notice && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{notice}</p>}
          {error && <ErrorBox msg={error} />}
          <label className="block">
            <span className="label">{label}</span>
            <textarea
              autoFocus
              rows={5}
              maxLength={1000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={placeholder}
              className="input resize-y"
            />
          </label>
          <div className="flex items-center justify-between gap-3 text-xs text-muted">
            <span>{hint}</span>
            <span className={`shrink-0 ${length < minLength ? 'text-red-600' : ''}`}>{length < minLength ? `${minLength - length} more characters` : `${length}/1000`}</span>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-line bg-cream/60 px-6 py-4">
          <button type="button" className="btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="btn !bg-red-600 !text-white hover:!bg-red-700 disabled:opacity-50" disabled={busy || length < minLength}>{busy ? busyLabel : submitLabel}</button>
        </div>
      </form>
    </div>,
    document.body,
  )
}
