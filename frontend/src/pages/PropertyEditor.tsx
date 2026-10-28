import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { api, lkr, prettyEnum, PROPERTY_TYPES, type OwnerPropertyDetail, type Photo } from '../api'
import { Select } from '../Select'
import { Empty, ErrorBox, Icon, PageHeader, Spinner, Status, universityOptions, useApi, useUniversities } from '../components'

/*
 * One place to set up a property: details, then rooms (each with its own photos),
 * then general photos, then review and submit for approval.
 */

const STEPS = [
  { key: 'details', label: 'Details', hint: 'Name, rent and location' },
  { key: 'rooms', label: 'Rooms', hint: 'Each room with its photos' },
  { key: 'photos', label: 'Photos', hint: 'Outside and shared areas' },
  { key: 'review', label: 'Review', hint: 'Check and submit' },
] as const
type StepKey = (typeof STEPS)[number]['key']

const ROOM_TYPES = ['Single room', 'Double room', 'Triple room', 'Shared room (4+)', 'Studio', 'Annex unit']
const MAP_HINT = 'In Google Maps, open the place, tap Share and copy the link.'
const MAX_PHOTO_MB = 10
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 150) + '-' + Math.random().toString(36).slice(2, 6)

/** Upload photos in batches of 5 (the API limit), optionally tagged to a room. */
async function uploadPhotos(propertyId: string, files: File[], roomId?: string) {
  const bad = files.find((f) => !PHOTO_TYPES.includes(f.type) || f.size > MAX_PHOTO_MB * 1024 * 1024)
  if (bad) throw new Error(`"${bad.name}" must be a JPG, PNG or WebP under ${MAX_PHOTO_MB} MB.`)
  for (let i = 0; i < files.length; i += 5) {
    const body = new FormData()
    if (roomId) body.append('roomId', roomId)
    files.slice(i, i + 5).forEach((f) => body.append('images', f))
    await api(`/images/properties/${propertyId}/images`, { method: 'POST', body })
  }
}

export default function PropertyEditor() {
  const { id } = useParams()
  const isNew = !id
  const [params, setParams] = useSearchParams()
  const step: StepKey = isNew ? 'details' : ((STEPS.find((s) => s.key === params.get('step'))?.key ?? 'details') as StepKey)
  const { data, error, loading, reload } = useApi<{ property: OwnerPropertyDetail }>(isNew ? null : `/properties/mine/${id}`)
  const property = data?.property ?? null
  const goto = (key: StepKey) => {
    setParams({ step: key }, { replace: true })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (!isNew && loading && !property) return <Spinner />
  if (!isNew && (error || !property)) return <div className="container-page max-w-3xl py-16"><ErrorBox msg={error ?? 'Property not found'} /></div>

  const roomPhotos = property?.images.filter((i) => i.roomId).length ?? 0
  const generalPhotos = property?.images.filter((i) => !i.roomId) ?? []
  const done: Record<StepKey, boolean> = {
    details: !!property,
    rooms: !!property?.rooms.length,
    photos: !!property?.images.length,
    review: !!property && property.status !== 'DRAFT' && property.status !== 'REJECTED',
  }

  return (
    <>
      <PageHeader
        eyebrow={isNew ? 'New listing' : 'Edit listing'}
        title={isNew ? 'Add a' : property!.title}
        accent={isNew ? 'Property' : ''}
        lede={isNew ? 'Start with the basics. You can add rooms and photos next.' : undefined}
        action={
          <div className="flex items-center gap-3">
            {property && <Status value={property.status} />}
            <Link to="/dashboard" className="btn-ghost">← My properties</Link>
          </div>
        }
      />

      <div className="container-page max-w-5xl py-10">
        {/* Stepper */}
        <ol className="grid grid-cols-4 gap-2" aria-label="Steps">
          {STEPS.map((s, i) => {
            const active = s.key === step
            const enabled = !isNew || s.key === 'details'
            return (
              <li key={s.key}>
                <button
                  type="button"
                  disabled={!enabled}
                  onClick={() => goto(s.key)}
                  aria-current={active ? 'step' : undefined}
                  className={`group flex w-full flex-col items-start gap-2 rounded-2xl border p-3 text-left transition sm:flex-row sm:items-center sm:p-4 ${active ? 'border-brand bg-white shadow-soft' : 'border-transparent hover:border-line hover:bg-white/60'} disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  <span className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-extrabold ${active ? 'bg-brand text-white' : done[s.key] ? 'bg-emerald-100 text-emerald-700' : 'bg-black/5 text-muted'}`}>
                    {done[s.key] && !active ? Icon.check : i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className={`block text-sm font-bold ${active ? 'text-brand' : ''}`}>{s.label}</span>
                    <span className="hidden truncate text-xs text-muted md:block">{s.hint}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ol>

        <div className="mt-8">
          {step === 'details' && <DetailsStep property={property} onSaved={() => { reload(); goto('rooms') }} />}
          {property && step === 'rooms' && <RoomsStep property={property} reload={reload} />}
          {property && step === 'photos' && (
            <StepCard title="Property photos" subtitle={`Show the outside, entrance, kitchen, bathroom and shared spaces. ${roomPhotos ? `${roomPhotos} room photo${roomPhotos === 1 ? '' : 's'} added in the Rooms step also appear in your gallery.` : 'Room photos are added in the Rooms step.'}`}>
              <PhotoGrid
                photos={generalPhotos}
                label="Add property photos"
                onUpload={(files) => uploadPhotos(property.id, files).then(reload)}
                onDelete={(photoId) => api(`/images/properties/${property.id}/images/${photoId}`, { method: 'DELETE' }).then(reload)}
              />
            </StepCard>
          )}
          {property && step === 'review' && <ReviewStep property={property} reload={reload} goto={goto} />}
        </div>

        {/* Step navigation */}
        {property && (
          <div className="mt-8 flex justify-between gap-3">
            {STEPS.findIndex((s) => s.key === step) > 0 ? (
              <button className="btn-ghost" onClick={() => goto(STEPS[STEPS.findIndex((s) => s.key === step) - 1].key)}>← Back</button>
            ) : <span />}
            {step !== 'review' && step !== 'details' && (
              <button className="btn-brand group" onClick={() => goto(STEPS[STEPS.findIndex((s) => s.key === step) + 1].key)}>
                Continue {Icon.arrow}
              </button>
            )}
          </div>
        )}
      </div>
    </>
  )
}

function StepCard({ title, subtitle, children, action }: { title: string; subtitle?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="card p-6 sm:p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight">{title}</h2>
          {subtitle && <p className="mt-1 max-w-2xl text-sm text-muted">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

/** Labelled form field. Use `group` around a <Select>: it names itself, and a <label> would forward clicks to it. */
const Field = ({ label, hint, children, wide, group }: { label: string; hint?: string; children: ReactNode; wide?: boolean; group?: boolean }) => {
  const Tag = group ? 'div' : 'label'
  return (
    <Tag className={`block ${wide ? 'sm:col-span-2' : ''}`}>
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-muted">{hint}</span>}
    </Tag>
  )
}

/* ------------------------------ Step 1: details ------------------------------ */

function DetailsStep({ property, onSaved }: { property: OwnerPropertyDetail | null; onSaved: () => void }) {
  const navigate = useNavigate()
  const unis = useUniversities()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)
  const locked = property?.status === 'PUBLISHED'

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const str = (k: string) => String(f.get(k) ?? '').trim()
    const body = {
      title: str('title'),
      description: str('description'),
      propertyType: str('propertyType'),
      address: str('address') || null,
      city: str('city'),
      monthlyRent: Number(str('monthlyRent')),
      securityDeposit: str('securityDeposit') ? Number(str('securityDeposit')) : null,
      universityId: str('universityId') || null,
      mapUrl: str('mapUrl') || null,
    }
    setBusy(true)
    setError(null)
    setSaved(false)
    try {
      if (property) {
        await api(`/properties/${property.id}`, { method: 'PATCH', json: body })
        setSaved(true)
        onSaved()
      } else {
        const { property: created } = await api<{ property: { id: string } }>('/properties', { method: 'POST', json: { ...body, slug: slugify(body.title) } })
        navigate(`/dashboard/properties/${created.id}?step=rooms`, { replace: true })
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <StepCard
      title="Property details"
      subtitle={locked ? 'This listing is published, so its details are locked. You can still add rooms and photos.' : 'Students see this information on your listing.'}
    >
      <form onSubmit={submit}>
        <fieldset disabled={locked || busy} className="grid gap-5 sm:grid-cols-2">
          {error && <div className="sm:col-span-2"><ErrorBox msg={error} /></div>}
          <Field label="Listing title" wide>
            <input name="title" required minLength={5} maxLength={150} defaultValue={property?.title} placeholder="e.g. Bright rooms near University of Peradeniya" className="input" />
          </Field>
          <Field label="Description" hint="Mention facilities, rules, distance to campus and transport (at least 20 characters)." wide>
            <textarea name="description" required minLength={20} maxLength={5000} rows={5} defaultValue={property?.description} placeholder="Describe the place…" className="input" />
          </Field>
          <Field label="Property type" group>
            <Select
              name="propertyType"
              label="Property type"
              defaultValue={property?.propertyType ?? PROPERTY_TYPES[0]}
              options={PROPERTY_TYPES.map((t) => ({ value: t, label: prettyEnum(t) }))}
            />
          </Field>
          <Field label="Nearest university (optional)" group>
            <Select
              name="universityId"
              label="Nearest university"
              searchable
              icon={Icon.cap}
              defaultValue={property?.universityId ?? ''}
              options={universityOptions(unis.list, 'No university selected')}
              loading={unis.loading}
              error={unis.error}
              onRetry={unis.retry}
            />
          </Field>
          <Field label="Address (optional)">
            <input name="address" maxLength={255} defaultValue={property?.address ?? ''} placeholder="Street and number" className="input" />
          </Field>
          <Field label="City">
            <input name="city" required minLength={2} maxLength={100} defaultValue={property?.city} placeholder="e.g. Kandy" className="input" />
          </Field>
          <Field label="Monthly rent from (LKR)" hint="The lowest monthly rent across your rooms.">
            <input name="monthlyRent" type="number" required min={1} defaultValue={property ? Number(property.monthlyRent) : undefined} placeholder="15000" className="input" />
          </Field>
          <Field label="Security deposit (LKR, optional)">
            <input name="securityDeposit" type="number" min={0} defaultValue={property?.securityDeposit != null ? Number(property.securityDeposit) : undefined} placeholder="30000" className="input" />
          </Field>
          <Field label="Google Maps link (optional)" hint={MAP_HINT} wide>
            <span className="relative block">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand [&_svg]:size-5">{Icon.pin}</span>
              <input name="mapUrl" type="url" maxLength={500} defaultValue={property?.mapUrl ?? ''} placeholder="https://maps.app.goo.gl/..." className="input !pl-10" />
            </span>
          </Field>
        </fieldset>
        {!locked && (
          <div className="mt-8 flex flex-wrap items-center justify-end gap-3 border-t border-line pt-6">
            {saved && <span role="status" className="text-sm font-semibold text-emerald-700">Saved</span>}
            <button disabled={busy} className="btn-brand group">
              {busy ? 'Saving…' : property ? 'Save and continue' : 'Create and add rooms'} {Icon.arrow}
            </button>
          </div>
        )}
      </form>
    </StepCard>
  )
}

/* ------------------------------ Step 2: rooms ------------------------------ */

function RoomsStep({ property, reload }: { property: OwnerPropertyDetail; reload: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [roomType, setRoomType] = useState(ROOM_TYPES[0])
  const [newPhotos, setNewPhotos] = useState<File[]>([])
  const formRef = useRef<HTMLFormElement>(null)

  const addRoom = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setBusy(true)
    setError(null)
    try {
      const { room } = await api<{ room: { id: string } }>(`/rooms/properties/${property.id}/rooms`, {
        method: 'POST',
        json: { name: String(f.get('name')).trim(), roomType, capacity: Number(f.get('capacity')), monthlyRent: Number(f.get('monthlyRent')) },
      })
      // The room exists now even if a photo upload fails; report that separately.
      if (newPhotos.length) {
        await uploadPhotos(property.id, newPhotos, room.id).catch((err: Error) => setError(`Room added, but photos failed: ${err.message}`))
      }
      formRef.current?.reset()
      setNewPhotos([])
      reload()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <StepCard title="Rooms" subtitle="Add each room students can book, with its own photos. Students book a specific room, not the whole building.">
        {property.rooms.length ? (
          <div className="space-y-4">
            {property.rooms.map((room, i) => (
              <article key={room.id} className="rounded-2xl border border-line p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-sm font-extrabold text-brand">{i + 1}</span>
                    <div>
                      <h3 className="font-bold">{room.name}</h3>
                      <p className="text-sm text-muted">{room.roomType} · sleeps {room.capacity} · <span className="font-semibold text-brand">{lkr(room.monthlyRent)}</span>/mo</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="text-sm font-semibold text-muted hover:text-red-600"
                    onClick={() => {
                      if (!confirm(`Delete "${room.name}"? Its photos stay as general property photos.`)) return
                      api(`/rooms/rooms/${room.id}`, { method: 'DELETE' }).then(reload, (e: Error) => setError(e.message))
                    }}
                  >
                    Delete room
                  </button>
                </div>
                <div className="mt-4">
                  <PhotoGrid
                    compact
                    photos={room.images}
                    label={`Add photos of ${room.name}`}
                    onUpload={(files) => uploadPhotos(property.id, files, room.id).then(reload)}
                    onDelete={(photoId) => api(`/images/properties/${property.id}/images/${photoId}`, { method: 'DELETE' }).then(reload)}
                  />
                </div>
              </article>
            ))}
          </div>
        ) : (
          <Empty icon={Icon.bed}>No rooms yet. Add your first room below.</Empty>
        )}
      </StepCard>

      <StepCard title={property.rooms.length ? 'Add another room' : 'Add a room'}>
        <form ref={formRef} onSubmit={addRoom}>
          <fieldset disabled={busy} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {error && <div className="sm:col-span-2 lg:col-span-4"><ErrorBox msg={error} /></div>}
            <Field label="Room name">
              <input name="name" required maxLength={100} placeholder={`e.g. Room ${property.rooms.length + 1}`} className="input" />
            </Field>
            <Field label="Room type" group>
              <Select label="Room type" value={roomType} onChange={setRoomType} options={ROOM_TYPES.map((t) => ({ value: t, label: t }))} />
            </Field>
            <Field label="Sleeps (people)">
              <input name="capacity" type="number" required min={1} max={20} defaultValue={1} className="input" />
            </Field>
            <Field label="Rent per month (LKR)">
              <input name="monthlyRent" type="number" required min={1} placeholder="15000" className="input" />
            </Field>
            <div className="sm:col-span-2 lg:col-span-4">
              <span className="label">Room photos (optional)</span>
              <FilePicker files={newPhotos} onChange={setNewPhotos} />
            </div>
          </fieldset>
          <div className="mt-6 flex justify-end">
            <button disabled={busy} className="btn-sun">{busy ? (newPhotos.length ? 'Adding room and uploading…' : 'Adding room…') : '+ Add room'}</button>
          </div>
        </form>
      </StepCard>
    </div>
  )
}

/** Local file picker with previews, used before the room exists. */
function FilePicker({ files, onChange }: { files: File[]; onChange: (files: File[]) => void }) {
  return (
    <div className="flex flex-wrap gap-3">
      {files.map((f, i) => (
        <div key={`${f.name}-${i}`} className="group relative size-24 overflow-hidden rounded-xl bg-brand-50">
          <img src={URL.createObjectURL(f)} alt="" className="size-full object-cover" onLoad={(e) => URL.revokeObjectURL(e.currentTarget.src)} />
          <button type="button" onClick={() => onChange(files.filter((_, j) => j !== i))} aria-label={`Remove ${f.name}`} className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-ink/70 text-xs text-white">✕</button>
        </div>
      ))}
      <label className="grid size-24 cursor-pointer place-items-center rounded-xl border-2 border-dashed border-line text-center text-xs font-semibold text-muted transition hover:border-brand hover:bg-brand-50 hover:text-brand">
        <span>
          <span className="block text-2xl leading-none">+</span>
          Choose
        </span>
        <input type="file" accept={PHOTO_TYPES.join(',')} multiple className="sr-only" onChange={(e) => { onChange([...files, ...Array.from(e.target.files ?? [])]); e.target.value = '' }} />
      </label>
    </div>
  )
}

/** Uploaded photos with delete, plus an upload tile. */
function PhotoGrid({ photos, label, onUpload, onDelete, compact }: { photos: Photo[]; label: string; onUpload: (files: File[]) => Promise<unknown>; onDelete: (id: string) => Promise<unknown>; compact?: boolean }) {
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const run = (msg: string, fn: () => Promise<unknown>) => {
    setBusy(msg)
    setError(null)
    fn().catch((e: Error) => setError(e.message)).finally(() => setBusy(null))
  }
  const tile = compact ? 'size-24' : 'aspect-[4/3]'
  return (
    <div>
      {error && <div className="mb-3"><ErrorBox msg={error} /></div>}
      <div className={compact ? 'flex flex-wrap gap-3' : 'grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4'}>
        {photos.map((p) => (
          <div key={p.id} className={`group relative overflow-hidden rounded-xl bg-brand-50 ${tile}`}>
            <img src={p.imageUrl} alt="" className="size-full object-cover" loading="lazy" />
            <button
              type="button"
              disabled={!!busy}
              onClick={() => confirm('Delete this photo?') && run('Deleting…', () => onDelete(p.id))}
              className="absolute right-1.5 top-1.5 rounded-full bg-ink/70 px-2 py-1 text-[11px] font-bold text-white opacity-0 transition group-hover:opacity-100 focus:opacity-100"
            >
              Delete
            </button>
          </div>
        ))}
        <label className={`grid cursor-pointer place-items-center rounded-xl border-2 border-dashed border-line text-center text-xs font-semibold text-muted transition hover:border-brand hover:bg-brand-50 hover:text-brand ${tile} ${busy ? 'pointer-events-none opacity-60' : ''}`}>
          <span className="px-2">
            {busy ? (
              <span className="mx-auto mb-1 block size-5 animate-spin rounded-full border-2 border-brand/20 border-t-brand" />
            ) : (
              <span className="block text-2xl leading-none">+</span>
            )}
            {busy ?? 'Add photos'}
          </span>
          <input
            type="file"
            accept={PHOTO_TYPES.join(',')}
            multiple
            aria-label={label}
            className="sr-only"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? [])
              e.target.value = ''
              if (files.length) run(`Uploading ${files.length}…`, () => onUpload(files))
            }}
          />
        </label>
      </div>
    </div>
  )
}

/* ------------------------------ Step 4: review ------------------------------ */

function ReviewStep({ property, reload, goto }: { property: OwnerPropertyDetail; reload: () => void; goto: (s: StepKey) => void }) {
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const submittable = property.status === 'DRAFT' || property.status === 'REJECTED'
  const checks: [boolean, string, StepKey, boolean?][] = [
    [true, 'Property details saved', 'details'],
    [property.rooms.length > 0, `At least one room (${property.rooms.length} added)`, 'rooms'],
    [property.images.length > 0, `At least one photo (${property.images.length} added)`, 'photos'],
    [!!property.mapUrl, property.mapUrl ? 'Google Maps link added' : 'Google Maps link (recommended)', 'details', true],
  ]
  const ready = checks.every(([ok, , , optional]) => ok || optional)

  const submit = () => {
    setBusy(true)
    setError(null)
    api(`/properties/${property.id}/submit`, { method: 'PATCH' })
      .then(reload, (e: Error) => setError(e.message))
      .finally(() => setBusy(false))
  }

  return (
    <StepCard title="Review and submit" subtitle="An admin checks every listing before students can see it.">
      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <ul className="space-y-3">
          {checks.map(([ok, text, target, optional]) => (
            <li key={text} className="flex items-center gap-3 rounded-xl border border-line p-3">
              <span className={`grid size-7 shrink-0 place-items-center rounded-full ${ok ? 'bg-emerald-100 text-emerald-700' : optional ? 'bg-sun-50 text-yellow-700' : 'bg-red-50 text-red-600'}`}>
                {ok ? Icon.check : optional ? '!' : '✕'}
              </span>
              <span className="flex-1 text-sm font-medium">{text}</span>
              {!ok && <button className="text-sm font-bold text-brand hover:underline" onClick={() => goto(target)}>Fix</button>}
            </li>
          ))}
        </ul>
        <div className="rounded-2xl bg-cream p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">{prettyEnum(property.propertyType)} · {property.city}</p>
          <p className="mt-1 text-lg font-extrabold">{property.title}</p>
          <p className="mt-1 text-sm font-bold text-brand">{lkr(property.monthlyRent)} / month</p>
          <ul className="mt-4 space-y-1.5 text-sm text-muted">
            {property.rooms.map((r) => (
              <li key={r.id} className="flex justify-between gap-3">
                <span className="truncate">{r.name} · {r.roomType}</span>
                <span className="shrink-0">{r.images.length} photo{r.images.length === 1 ? '' : 's'}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-end gap-3 border-t border-line pt-6">
        {error && <div className="w-full"><ErrorBox msg={error} /></div>}
        {submittable ? (
          <button disabled={!ready || busy} onClick={submit} className="btn-sun">
            {busy ? 'Submitting…' : property.status === 'REJECTED' ? 'Resubmit for approval' : 'Submit for approval'}
          </button>
        ) : property.status === 'PUBLISHED' ? (
          <Link to={`/properties/${property.id}`} className="btn-brand">View live listing</Link>
        ) : (
          <p className="text-sm font-semibold text-muted">Submitted. An admin will review it soon.</p>
        )}
      </div>
    </StepCard>
  )
}
