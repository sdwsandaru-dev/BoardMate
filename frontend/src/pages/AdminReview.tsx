import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, lkr, prettyEnum, type AdminPropertyDetail } from '../api'
import { Avatar, Empty, ErrorBox, Icon, Spinner, Status, useApi } from '../components'
import { RejectDialog } from './Dashboard'
import { Gallery, RoomPhotos } from './PropertyDetail'

/** Admin: full details of a submitted listing, with verify, approve and reject. */
export default function AdminReview() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, error, loading, reload } = useApi<{ property: AdminPropertyDetail }>(`/admin/properties/${id}`)
  const [photo, setPhoto] = useState(0)
  const [busy, setBusy] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState(false)

  if (loading && !data) return <Spinner />
  if (error || !data) return <div className="container-page max-w-3xl py-16"><ErrorBox msg={error ?? 'Property not found'} /></div>
  const p = data.property

  const run = (label: string, path: string, after: () => void) => async () => {
    setBusy(label)
    setActionError(null)
    try {
      await api(path, { method: 'PATCH' })
      after()
    } catch (e) {
      setActionError((e as Error).message)
    } finally {
      setBusy(null)
    }
  }
  const backToDashboard = () => navigate('/dashboard')

  const pending = p.status === 'PENDING_APPROVAL'
  const verified = p.verificationStatus === 'VERIFIED'
  const roomPhotos = p.images.filter((i) => i.roomId).length
  const checks: [boolean, string, boolean?][] = [
    [p.rooms.length > 0, `${p.rooms.length} room${p.rooms.length === 1 ? '' : 's'} listed`],
    [p.images.length > 0, `${p.images.length} photo${p.images.length === 1 ? '' : 's'} (${roomPhotos} of rooms)`],
    [p.rooms.every((r) => r.images.length > 0), 'Every room has a photo', true],
    [!!p.mapUrl, 'Google Maps link added', true],
    [!!p.address, 'Street address given', true],
    [p.owner.status === 'ACTIVE', 'Owner account is active'],
  ]

  return (
    <div className="container-page py-8">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-muted">
        <Link to="/dashboard" className="hover:text-brand">Dashboard</Link>
        <span aria-hidden>/</span>
        <span>Review listing</span>
      </nav>

      <header className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand">{prettyEnum(p.propertyType)}</span>
            <Status value={p.status} />
            <Status value={p.verificationStatus} />
          </div>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{p.title}</h1>
          <p className="mt-2 inline-flex items-center gap-1 text-sm text-muted">
            <span className="text-brand [&_svg]:size-4">{Icon.pin}</span>{p.address ? `${p.address}, ` : ''}{p.city}
          </p>
        </div>
      </header>

      <Gallery images={p.images} title={p.title} active={Math.min(photo, Math.max(p.images.length - 1, 0))} onSelect={setPhoto} />

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-12">
          <section>
            <h2 className="text-xl font-extrabold">Description</h2>
            <p className="mt-4 whitespace-pre-line leading-relaxed text-muted">{p.description}</p>
            <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                ['Monthly rent', lkr(p.monthlyRent)],
                ['Security deposit', lkr(p.securityDeposit)],
                ['City', p.city],
                ['Nearest university', p.university?.name ?? '—'],
                ['Submitted', new Date(p.updatedAt).toLocaleDateString()],
                ['Created', new Date(p.createdAt).toLocaleDateString()],
              ].map(([k, v]) => (
                <div key={k} className="rounded-2xl border border-line bg-white p-4">
                  <dt className="text-xs font-semibold text-muted">{k}</dt>
                  <dd className="mt-1 font-bold">{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section>
            <h2 className="text-xl font-extrabold">Location</h2>
            <div className="card mt-4 flex flex-wrap items-center gap-4 p-5">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand">{Icon.pin}</span>
              <div className="min-w-0 flex-1">
                <p className="font-bold">{p.address || 'No street address given'}</p>
                <p className="text-sm text-muted">{p.city}</p>
              </div>
              {p.mapUrl ? (
                <a href={p.mapUrl} target="_blank" rel="noopener noreferrer" className="btn-brand group">Open in Google Maps {Icon.arrow}</a>
              ) : (
                <p className="text-xs text-muted">No map link added.</p>
              )}
            </div>
          </section>

          <section>
            <div className="flex items-baseline justify-between">
              <h2 className="text-xl font-extrabold">Rooms</h2>
              <span className="text-sm text-muted">{p.rooms.length} total</span>
            </div>
            {p.rooms.length ? (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {p.rooms.map((r) => (
                  <div key={r.id} className="card flex flex-col p-5">
                    {r.images.length ? <RoomPhotos photos={r.images} name={r.name} /> : (
                      <p className="-mx-5 -mt-5 mb-5 rounded-t-2xl bg-sun-50 px-5 py-3 text-xs font-semibold text-yellow-800">No photos of this room</p>
                    )}
                    <div className="flex items-start gap-3">
                      <span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand">{Icon.bed}</span>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold">{r.name}</h3>
                        <p className="text-sm text-muted">{r.roomType} · sleeps {r.capacity}</p>
                      </div>
                      <Status value={r.status} />
                    </div>
                    <p className="mt-5 border-t border-line pt-4 font-extrabold text-brand">{lkr(r.monthlyRent)}<span className="text-xs font-medium text-muted"> /mo</span></p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-5"><Empty icon={Icon.bed}>No rooms added.</Empty></div>
            )}
          </section>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <div className="card overflow-hidden">
            <div className="border-b border-line p-6">
              <h2 className="font-extrabold">Decision</h2>
              <p className="mt-1 text-sm text-muted">{pending ? 'Verify the details first, then approve to publish.' : `This listing is ${prettyEnum(p.status).toLowerCase()}. Nothing to decide.`}</p>
            </div>
            {pending && (
              <div className="space-y-3 p-6">
                {actionError && <ErrorBox msg={actionError} />}
                <Step n={1} done={verified} title="Verify details" hint="You checked the photos, rooms and location.">
                  {!verified && (
                    <button className="btn-brand w-full" disabled={!!busy} onClick={run('verify', `/admin/properties/${p.id}/verify`, reload)}>
                      {busy === 'verify' ? 'Verifying…' : 'Mark as verified'}
                    </button>
                  )}
                </Step>
                <Step n={2} done={false} title="Approve and publish" hint={verified ? 'Students will see it in listings right away.' : 'Available after verifying.'}>
                  <button className="btn-sun w-full" disabled={!verified || !!busy} onClick={run('approve', `/admin/properties/${p.id}/approve`, backToDashboard)}>
                    {busy === 'approve' ? 'Publishing…' : 'Approve and publish'}
                  </button>
                </Step>
                <div className="border-t border-line pt-3">
                  <button className="w-full rounded-full px-4 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50" disabled={!!busy} onClick={() => setRejecting(true)}>
                    Reject with a reason
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="card p-6">
            <h2 className="font-extrabold">Checklist</h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              {checks.map(([ok, label, optional]) => (
                <li key={label} className="flex items-center gap-2.5">
                  <span className={`grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-bold ${ok ? 'bg-emerald-50 text-emerald-600' : optional ? 'bg-sun-50 text-yellow-700' : 'bg-red-50 text-red-600'}`}>{ok ? '✓' : '!'}</span>
                  <span className={ok ? '' : 'text-muted'}>{label}{!ok && optional ? ' (missing)' : ''}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="card p-6">
            <h2 className="font-extrabold">Owner</h2>
            <div className="mt-4 flex items-center gap-3">
              <Avatar name={p.owner.fullName} className="size-11 text-sm" />
              <div className="min-w-0">
                <p className="truncate font-bold">{p.owner.fullName}</p>
                <p className="truncate text-xs text-muted">{p.owner.email}</p>
              </div>
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-muted">Phone</dt><dd className="font-semibold">{p.owner.phone ?? '—'}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">Account</dt><dd><Status value={p.owner.status} /></dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">Owner verification</dt><dd><Status value={p.owner.ownerProfile?.verificationStatus ?? 'PENDING'} /></dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">Joined</dt><dd className="font-semibold">{new Date(p.owner.createdAt).toLocaleDateString()}</dd></div>
            </dl>
          </div>
        </aside>
      </div>

      {rejecting && <RejectDialog property={p} onClose={() => setRejecting(false)} onDone={backToDashboard} />}
    </div>
  )
}

function Step({ n, done, title, hint, children }: { n: number; done: boolean; title: string; hint: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-line p-4">
      <div className="flex items-start gap-3">
        <span className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-extrabold ${done ? 'bg-emerald-500 text-white' : 'bg-brand-50 text-brand'}`}>{done ? '✓' : n}</span>
        <div className="min-w-0">
          <p className="font-bold">{title}{done && <span className="ml-2 text-xs font-semibold text-emerald-600">Done</span>}</p>
          <p className="text-xs text-muted">{hint}</p>
        </div>
      </div>
      {children && <div className="mt-3">{children}</div>}
    </div>
  )
}
