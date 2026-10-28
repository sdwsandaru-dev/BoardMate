import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, fmtDay, lkr, prettyEnum, type Favorite, type Photo, type PropertyDetail as Detail, type ReviewList, type Room } from '../api'
import { useAuth } from '../auth'
import { AvailabilityBadge, Avatar, Empty, ErrorBox, Icon, Spinner, useApi } from '../components'

const today = () => new Date().toISOString().slice(0, 10)

export default function PropertyDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const { data: p, error, loading } = useApi<{ property: Detail }>(`/properties/${id}`)
  const reviews = useApi<ReviewList>(`/properties/${id}/reviews`)
  const favs = useApi<{ favorites: Favorite[] }>(user ? '/favorites' : null)
  const [photo, setPhoto] = useState(0)
  const [bookingRoom, setBookingRoom] = useState<Room | null>(null)

  if (loading) return <Spinner />
  if (error || !p) return <div className="container-page max-w-3xl py-16"><ErrorBox msg={error ?? 'Property not found'} /></div>
  const property = p.property
  const isFav = !!favs.data?.favorites.some((f) => f.property.id === property.id)
  const isStudent = user?.role === 'STUDENT'
  const rating = reviews.data?.totalReviews ? reviews.data : null
  const isFree = (r: Room) => r.availability?.state !== 'BOOKED'
  // Free rooms first; booked ones stay visible with their dates.
  const rooms = [...property.rooms].sort((a, b) => Number(!isFree(a)) - Number(!isFree(b)))
  const freeRooms = rooms.filter(isFree)
  const avail = property.availability

  const toggleFav = async () => {
    await api(`/favorites/${property.id}`, { method: isFav ? 'DELETE' : 'POST' }).catch((e: Error) => alert(e.message))
    favs.reload()
  }

  return (
    <div className="container-page py-8">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-muted">
        <Link to="/" className="hover:text-brand">Home</Link>
        <span aria-hidden>/</span>
        <Link to="/listings" className="hover:text-brand">Listings</Link>
        <span aria-hidden>/</span>
        <span className="truncate font-semibold text-ink">{property.title}</span>
      </nav>

      <header className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand">{prettyEnum(property.propertyType)}</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">{Icon.check} Verified</span>
            {avail && <AvailabilityBadge a={avail} />}
          </div>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{property.title}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
            <span className="inline-flex items-center gap-1"><span className="text-brand [&_svg]:size-4">{Icon.pin}</span>{property.address ? `${property.address}, ` : ''}{property.city}</span>
            {rating && <span className="inline-flex items-center gap-1 font-semibold text-ink"><span className="text-sun">{Icon.star}</span>{rating.averageRating} · {rating.totalReviews} review{rating.totalReviews === 1 ? '' : 's'}</span>}
          </p>
        </div>
        {user && (
          <button onClick={toggleFav} className={`btn-ghost ${isFav ? '!border-brand/40 text-brand' : ''}`} aria-pressed={isFav}>
            {Icon.heart(isFav)} {isFav ? 'Saved' : 'Save'}
          </button>
        )}
      </header>

      <Gallery images={property.images} title={property.title} active={photo} onSelect={setPhoto} />

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-12">
          <section>
            <h2 className="text-xl font-extrabold">About this place</h2>
            <p className="mt-4 whitespace-pre-line leading-relaxed text-muted">{property.description}</p>
            <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ['Type', prettyEnum(property.propertyType)],
                ['City', property.city],
                ['Rooms available', `${freeRooms.length} of ${rooms.length}`],
                ['Listed', new Date(property.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })],
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
                <p className="font-bold">{property.address || property.city}</p>
                <p className="text-sm text-muted">{property.address ? property.city : property.mapUrl ? 'See the map for the exact spot' : 'Area'}</p>
              </div>
              {property.mapUrl ? (
                <a href={property.mapUrl} target="_blank" rel="noopener noreferrer" className="btn-brand group">
                  Open in Google Maps {Icon.arrow}
                </a>
              ) : (
                <p className="text-xs text-muted">The owner hasn't added a map link yet.</p>
              )}
            </div>
          </section>

          <section>
            <div className="flex items-baseline justify-between">
              <h2 className="text-xl font-extrabold">Rooms</h2>
              <span className="text-sm text-muted">{freeRooms.length} of {rooms.length} available now</span>
            </div>
            {rooms.length ? (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {rooms.map((r) => {
                  const a = r.availability
                  const booked = a?.state === 'BOOKED'
                  // An open-ended stay means the room can't be requested at all.
                  const canRequest = !booked || !!a?.availableFrom
                  return (
                    <div key={r.id} className={`card flex flex-col p-5 transition ${booked ? 'bg-black/[0.015]' : 'hover:border-brand/30'}`}>
                      {!!r.images?.length && (
                        <div className={booked ? 'opacity-60 grayscale-[40%]' : ''}><RoomPhotos photos={r.images} name={r.name} /></div>
                      )}
                      <div className="flex items-start gap-3">
                        <span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand">{Icon.bed}</span>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold">{r.name}</h3>
                          <p className="text-sm text-muted">{r.roomType} · sleeps {r.capacity}</p>
                        </div>
                      </div>
                      <RoomStatus a={a} />
                      <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
                        <p className="font-extrabold text-brand">{lkr(r.monthlyRent)}<span className="text-xs font-medium text-muted"> /mo</span></p>
                        {isStudent && canRequest && (
                          <button className={`${booked ? 'btn-ghost' : 'btn-sun'} !px-4 !py-2`} onClick={() => setBookingRoom(r)}>
                            {booked ? `Request from ${fmtDay(a!.availableFrom!)}` : 'Request'}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="mt-5"><Empty icon={Icon.bed}>No rooms are available right now.</Empty></div>
            )}
          </section>

          <Reviews propertyId={property.id} data={reviews.data} reload={reviews.reload} canReview={isStudent} />
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card overflow-hidden">
            <div className="bg-brand p-6 text-white">
              <p className="text-sm text-white/70">Monthly rent from</p>
              <p className="mt-1 text-3xl font-extrabold">{lkr(property.monthlyRent)}</p>
            </div>
            <dl className="space-y-3 p-6 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Security deposit</dt><dd className="font-bold">{lkr(property.securityDeposit)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Rooms available now</dt><dd className="font-bold">{freeRooms.length} of {rooms.length}</dd></div>
            </dl>
            {avail?.fullyBooked && (
              <p className="mx-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">
                <span className="font-bold">Fully booked from {fmtDay(avail.bookedFrom!)}.</span>{' '}
                {avail.nextAvailableFrom ? `The first room frees up on ${fmtDay(avail.nextAvailableFrom)}.` : 'No end date has been set for the current stays.'}
              </p>
            )}
            <div className="border-t border-line p-6">
              <div className="flex items-center gap-3">
                <Avatar name={property.owner.fullName} className="size-11 text-sm" />
                <div>
                  <p className="text-xs text-muted">Listed by</p>
                  <p className="font-bold">{property.owner.fullName}</p>
                </div>
              </div>
              {isStudent && freeRooms[0] && (
                <button className="btn-sun mt-6 w-full !py-3" onClick={() => setBookingRoom(freeRooms[0])}>Request a booking</button>
              )}
              {!user && (
                <Link to="/login" state={{ from: `/properties/${property.id}` }} className="btn-brand mt-6 w-full !py-3">Log in to book</Link>
              )}
              {property.mapUrl && (
                <a href={property.mapUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost mt-3 w-full">
                  <span className="text-brand [&_svg]:size-5">{Icon.pin}</span> View on Google Maps
                </a>
              )}
              <p className="mt-4 flex items-center gap-2 text-xs text-muted"><span className="text-emerald-600">{Icon.shield}</span>No payment needed to send a request.</p>
            </div>
          </div>
        </aside>
      </div>

      {bookingRoom && <BookingDialog room={bookingRoom} onClose={() => setBookingRoom(null)} />}
    </div>
  )
}

function RoomStatus({ a }: { a: Room['availability'] }) {
  if (!a) return null
  const [tone, text] =
    a.state === 'BOOKED'
      ? ['bg-red-50 text-red-700', a.availableFrom ? `Booked from ${fmtDay(a.bookedFrom!)} until ${fmtDay(a.availableFrom)}` : `Booked from ${fmtDay(a.bookedFrom!)}`]
      : a.bookedFrom
        ? ['bg-sun-50 text-yellow-800', `Available now · booked from ${fmtDay(a.bookedFrom)}`]
        : ['bg-emerald-50 text-emerald-700', 'Available now']
  return (
    <p className={`mt-4 inline-flex items-center gap-1.5 self-start rounded-full px-2.5 py-1 text-xs font-bold ${tone}`}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {text}
    </p>
  )
}

/** A room's own photos: one large image with small thumbnails to switch. */
export function RoomPhotos({ photos, name }: { photos: Photo[]; name: string }) {
  const [i, setI] = useState(0)
  return (
    <div className="-mx-5 -mt-5 mb-5">
      <div className="relative aspect-[16/10] overflow-hidden rounded-t-2xl bg-brand-50">
        <img src={photos[i].imageUrl} alt={`${name}, photo ${i + 1}`} className="size-full object-cover" loading="lazy" />
        {photos.length > 1 && (
          <span className="absolute bottom-2 right-2 rounded-full bg-ink/70 px-2 py-0.5 text-[11px] font-bold text-white">{i + 1}/{photos.length}</span>
        )}
      </div>
      {photos.length > 1 && (
        <div className="flex gap-1.5 px-5 pt-2">
          {photos.map((p, j) => (
            <button key={p.id} onClick={() => setI(j)} aria-label={`Show ${name} photo ${j + 1}`} aria-current={i === j} className={`size-10 overflow-hidden rounded-lg ring-2 transition ${i === j ? 'ring-brand' : 'ring-transparent opacity-70 hover:opacity-100'}`}>
              <img src={p.imageUrl} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function Gallery({ images, title, active, onSelect }: { images: Photo[]; title: string; active: number; onSelect: (i: number) => void }) {
  if (!images.length) {
    return <div className="mt-6 grid aspect-[21/9] place-items-center rounded-[2rem] bg-brand-50 text-brand/30 [&_svg]:size-12">{Icon.home}</div>
  }
  return (
    <div className="mt-6 grid gap-3 lg:grid-cols-[2fr_1fr]">
      <div className="aspect-[16/10] overflow-hidden rounded-[2rem] bg-brand-50">
        <img src={images[active]?.imageUrl} alt={title} className="size-full object-cover" />
      </div>
      {images.length > 1 && (
        <div className="grid grid-cols-4 gap-3 lg:grid-cols-2 lg:content-start">
          {images.map((img, i) => (
            <button key={img.id} onClick={() => onSelect(i)} aria-label={`Show photo ${i + 1}`} aria-current={i === active} className={`aspect-square overflow-hidden rounded-2xl ring-2 ring-offset-2 ring-offset-cream transition ${i === active ? 'ring-brand' : 'ring-transparent opacity-80 hover:opacity-100'}`}>
              <img src={img.imageUrl} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function BookingDialog({ room, onClose }: { room: Room; onClose: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  const periods = room.bookedPeriods ?? []
  const earliest = room.availability?.state === 'BOOKED' && room.availability.availableFrom ? room.availability.availableFrom.slice(0, 10) : today()
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const moveIn = String(f.get('moveInDate'))
    const moveOut = String(f.get('moveOutDate') || '')
    // Same overlap rule as the server: stays are [from, until), an empty end means no end.
    const clash = periods.find((p) => moveIn < (p.until?.slice(0, 10) ?? '9999-12-31') && p.from.slice(0, 10) < (moveOut || '9999-12-31'))
    if (clash) {
      setError(
        clash.until
          ? `This room is booked from ${fmtDay(clash.from)} until ${fmtDay(clash.until)}. Pick dates outside that period.`
          : `This room is booked from ${fmtDay(clash.from)} with no end date. Pick a move-out date before then.`,
      )
      return
    }
    setBusy(true)
    setError(null)
    try {
      await api('/bookings', {
        method: 'POST',
        json: {
          roomId: room.id,
          moveInDate: f.get('moveInDate'),
          moveOutDate: f.get('moveOutDate') || undefined,
          message: String(f.get('message') || '').trim() || undefined,
        },
      })
      setDone(true)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="booking-title" onClick={onClose}>
      <div className="card w-full max-w-md animate-fade-up overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {done ? (
          <div className="p-8 text-center">
            <div className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-50 text-emerald-600 [&_svg]:size-7">{Icon.check}</div>
            <h2 id="booking-title" className="mt-5 text-2xl font-extrabold">Request sent</h2>
            <p className="mt-2 text-muted">The owner will review your request. You'll get a notification when they respond.</p>
            <div className="mt-8 flex justify-center gap-2">
              <button className="btn-ghost" onClick={onClose}>Close</button>
              <Link to="/dashboard" className="btn-brand">View my bookings</Link>
            </div>
          </div>
        ) : (
          <form onSubmit={submit}>
            <div className="flex items-start justify-between border-b border-line p-6">
              <div>
                <h2 id="booking-title" className="text-xl font-extrabold">Book {room.name}</h2>
                <p className="mt-1 text-sm text-muted">{room.roomType} · {lkr(room.monthlyRent)} / month</p>
              </div>
              <button type="button" onClick={onClose} aria-label="Close" className="grid size-9 place-items-center rounded-full text-muted hover:bg-black/5">✕</button>
            </div>
            <div className="space-y-4 p-6">
              {periods.length > 0 && (
                <div className="rounded-2xl bg-sun-50 px-4 py-3 text-sm text-yellow-900">
                  <p className="font-bold">Already booked</p>
                  <ul className="mt-1 space-y-0.5">
                    {periods.map((p) => (
                      <li key={p.from}>{fmtDay(p.from)} → {p.until ? fmtDay(p.until) : 'no end date'}</li>
                    ))}
                  </ul>
                  <p className="mt-1 text-xs text-yellow-800">Choose dates outside these periods.</p>
                </div>
              )}
              {error && <ErrorBox msg={error} />}
              <div className="grid grid-cols-2 gap-3">
                <label><span className="label">Move-in date</span><input name="moveInDate" type="date" required min={earliest} defaultValue={earliest === today() ? undefined : earliest} className="input" /></label>
                <label><span className="label">Move-out (optional)</span><input name="moveOutDate" type="date" min={earliest} className="input" /></label>
              </div>
              <label className="block"><span className="label">Message to owner (optional)</span>
                <textarea name="message" maxLength={1000} rows={3} placeholder="Introduce yourself and mention your university" className="input" />
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-line bg-cream/60 p-4">
              <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
              <button disabled={busy} className="btn-sun">{busy ? 'Sending…' : 'Send request'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

function Stars({ value }: { value: number }) {
  return (
    <span className="flex" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => <span key={n} className={n <= Math.round(value) ? 'text-sun' : 'text-black/10'}>{Icon.star}</span>)}
    </span>
  )
}

function Reviews({ propertyId, data, reload, canReview }: { propertyId: string; data: ReviewList | null; reload: () => void; canReview: boolean }) {
  const [rating, setRating] = useState(5)
  const [error, setError] = useState<string | null>(null)
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const comment = String(new FormData(form).get('comment') || '').trim()
    setError(null)
    try {
      await api(`/properties/${propertyId}/reviews`, { method: 'POST', json: { rating, comment: comment || undefined } })
      form.reset()
      reload()
    } catch (err) {
      setError((err as Error).message)
    }
  }
  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-extrabold">Reviews</h2>
        {!!data?.totalReviews && (
          <div className="flex items-center gap-3">
            <span className="text-3xl font-extrabold">{data.averageRating}</span>
            <div>
              <Stars value={data.averageRating} />
              <p className="text-xs text-muted">{data.totalReviews} review{data.totalReviews === 1 ? '' : 's'}</p>
            </div>
          </div>
        )}
      </div>
      {canReview && (
        <form onSubmit={submit} className="card mt-5 space-y-4 p-6">
          <p className="text-sm font-bold">Stayed here? Share your experience</p>
          {error && <ErrorBox msg={error} />}
          <div className="flex gap-1" role="radiogroup" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <button type="button" key={n} role="radio" aria-checked={rating === n} aria-label={`${n} stars`} onClick={() => setRating(n)} className={`transition hover:scale-110 [&_svg]:size-7 ${n <= rating ? 'text-sun' : 'text-black/10'}`}>{Icon.star}</button>
            ))}
          </div>
          <textarea name="comment" maxLength={2000} rows={3} placeholder="What was it like living here?" aria-label="Review comment" className="input" />
          <button className="btn-brand">Post review</button>
        </form>
      )}
      <div className="mt-5 space-y-4">
        {data?.reviews.length ? (
          data.reviews.map((r) => (
            <article key={r.id} className="card p-6">
              <div className="flex items-center gap-3">
                <Avatar name={r.student.fullName} />
                <div className="flex-1">
                  <p className="font-bold">{r.student.fullName}</p>
                  <p className="text-xs text-muted">{new Date(r.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}</p>
                </div>
                <Stars value={r.rating} />
              </div>
              {r.comment && <p className="mt-4 leading-relaxed text-muted">{r.comment}</p>}
            </article>
          ))
        ) : (
          <Empty icon={Icon.star}>No reviews yet. Students who stay here can leave one.</Empty>
        )}
      </div>
    </section>
  )
}
