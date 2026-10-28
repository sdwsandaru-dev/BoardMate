import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PROPERTY_TYPES, prettyEnum, qs, type Pagination, type PropertySummary } from '../api'
import { useAuth } from '../auth'
import { Select } from '../Select'
import { Blob, CardSkeleton, Empty, Icon, PHOTOS, PropertyCard, SectionHeader, Sparkle, universityOptions, useApi, useUniversities } from '../components'

export default function Home() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const dashboardLabel = user?.role === 'OWNER' ? 'Manage my listings' : user?.role === 'ADMIN' ? 'Admin console' : 'My bookings'
  const [search, setSearch] = useState('')
  const [universityId, setUniversityId] = useState('')
  const unis = useUniversities()
  const [type, setType] = useState('')
  const latest = useApi<{ properties: PropertySummary[]; pagination: Pagination }>('/properties?limit=6')

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <Blob className="-left-20 -top-24 size-56" />
        <Blob color="bg-brand" className="-bottom-28 -left-28 size-64" />
        <div className="container-page relative grid items-center gap-12 pb-20 pt-10 lg:grid-cols-[1.05fr_1fr] lg:pb-28 lg:pt-16">
          <div className="animate-fade-up">
            <p className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold text-muted shadow-soft">
              <span className="grid size-5 place-items-center rounded-full bg-sun text-ink">{Icon.check}</span>
              Every listing verified by our team
            </p>
            <h1 className="mt-6 text-5xl font-extrabold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
              Find Your
              <br />
              Next Home
              <br />
              <span className="underline-sun">Near Campus</span>
            </h1>
            <p className="mt-7 max-w-md text-lg leading-relaxed text-muted">
              Safe. Affordable. Student-Friendly. Rooms, annexes and boarding houses close to your university.
            </p>

            <form
              className="mt-9 grid gap-2 rounded-3xl border border-line bg-white p-2 shadow-lift sm:grid-cols-[1fr_1.3fr_auto] sm:rounded-full"
              onSubmit={(e) => {
                e.preventDefault()
                navigate(`/listings${qs({ search, universityId, propertyType: type })}`)
              }}
            >
              <label className="flex items-center gap-2 rounded-full px-4 py-2 text-muted focus-within:text-brand">
                {Icon.search}
                <span className="sr-only">Keyword</span>
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Keyword or area" className="w-full bg-transparent text-sm text-ink outline-none" />
              </label>
              <Select
                label="University"
                variant="bare"
                searchable
                icon={Icon.cap}
                className="min-w-0 sm:border-l sm:border-line"
                value={universityId}
                onChange={setUniversityId}
                options={universityOptions(unis.list, 'Any university')}
              loading={unis.loading} error={unis.error} onRetry={unis.retry}
              />
              <button className="btn-sun group !py-3">Search {Icon.arrow}</button>
            </form>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold text-muted">Popular:</span>
              {PROPERTY_TYPES.slice(0, 4).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(type === t ? '' : t)}
                  aria-pressed={type === t}
                  className={`rounded-full border px-3 py-1 font-semibold transition ${type === t ? 'border-brand bg-brand text-white' : 'border-line bg-white hover:border-brand/40 hover:text-brand'}`}
                >
                  {prettyEnum(t)}
                </button>
              ))}
            </div>
          </div>

          <div className="relative animate-fade-up [animation-delay:120ms]">
            <Sparkle className="absolute -left-8 -top-8" />
            <img src={PHOTOS.room} alt="A bright, tidy student room" className="aspect-[4/5] w-full rounded-[2.5rem] object-cover shadow-lift sm:aspect-[5/5]" />
            <Blob className="-bottom-8 -right-8 -z-10 size-32" />
            <div className="card absolute -left-6 bottom-10 hidden w-60 p-4 sm:block">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand">{Icon.shield}</span>
                <div>
                  <p className="text-sm font-bold">Verified listings</p>
                  <p className="text-xs text-muted">Checked before publishing</p>
                </div>
              </div>
            </div>
            <div className="card absolute -right-4 top-8 hidden items-center gap-2 px-4 py-3 sm:flex">
              <span className="flex text-sun">{Icon.star}{Icon.star}{Icon.star}{Icon.star}{Icon.star}</span>
              <span className="text-xs font-bold">Rated by students</span>
            </div>
          </div>
        </div>
      </section>

      {/* Value props: "Student Living Made Simple" */}
      <section className="border-y border-line bg-white py-20">
        <div className="container-page grid items-center gap-12 lg:grid-cols-[1fr_1.5fr]">
          <SectionHeader eyebrow="Why BoardMate" lead="Student Living" accent="Made Simple" lede="Everything you need to find a safe place to live, without the endless calls and site visits." />
          <div className="grid gap-5 sm:grid-cols-3">
            {[
              [Icon.home, 'Find Listings', 'Boarding houses, annexes, hostels and apartments in one place.'],
              [Icon.shield, 'Verified Properties', 'Our team reviews every listing before it goes live.'],
              [Icon.people, 'Student-Friendly', 'Built for students, with honest reviews from students.'],
            ].map(([icon, title, text]) => (
              <div key={title as string} className="group rounded-2xl border border-line p-6 transition hover:-translate-y-1 hover:border-brand/30 hover:shadow-lift">
                <div className="grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand transition group-hover:bg-brand group-hover:text-white">{icon}</div>
                <h3 className="mt-5 font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Latest listings */}
      <section className="container-page py-24">
        <SectionHeader
          eyebrow="Latest listings"
          lead="Spaces That Feel"
          accent="Like Home"
          lede="Freshly published places, verified and ready for you to book."
          action={<Link to="/listings" className="btn-ghost group">View all listings {Icon.arrow}</Link>}
        />
        {latest.loading ? (
          <CardSkeleton count={3} />
        ) : latest.data?.properties.length ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {latest.data.properties.map((p) => <PropertyCard key={p.id} p={p} />)}
          </div>
        ) : (
          <Empty>{latest.error ?? 'New listings are on their way. Check back soon!'}</Empty>
        )}
      </section>

      {/* How it works: "Find. Book. Move In." */}
      <section className="bg-white py-24">
        <div className="container-page">
          <SectionHeader eyebrow="How it works" lead="Find. Book." accent="Move In." lede="Three steps from searching to settling in." />
          <ol className="grid gap-6 md:grid-cols-3">
            {[
              [Icon.search, 'Find', 'Filter by city, university, budget and type of place.', PHOTOS.stepFind],
              [Icon.calendar, 'Book', 'Pick a room and send a request with your move-in date.', PHOTOS.stepBook],
              [Icon.key, 'Move in', 'The owner confirms, and you get notified straight away.', PHOTOS.stepMoveIn],
            ].map(([icon, title, text, photo], i) => (
              <li key={title as string} className="group relative isolate flex min-h-[340px] flex-col justify-end overflow-hidden rounded-3xl p-8 text-white shadow-lift">
                <img src={photo as string} alt="" loading="lazy" className="absolute inset-0 -z-10 size-full object-cover transition duration-700 group-hover:scale-105" />
                {/* Dark gradient keeps the text readable over any part of the photo. */}
                <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink/95 via-ink/60 to-ink/10" />
                <span className="absolute right-6 top-4 text-6xl font-extrabold text-white/25">0{i + 1}</span>
                <div className="absolute left-8 top-8 grid size-12 place-items-center rounded-2xl bg-sun text-ink shadow-lg [&_svg]:size-6">{icon}</div>
                <h3 className="text-2xl font-extrabold">{title}</h3>
                <span className="mt-2 block h-1 w-10 rounded-full bg-sun transition-all duration-300 group-hover:w-16" />
                <p className="mt-3 text-sm leading-relaxed text-white/85">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* "Prime Locations Near Top Universities" */}
      <section className="container-page py-24">
        <div className="relative overflow-hidden rounded-[2.5rem] shadow-lift">
          <img src={PHOTOS.city} alt="" className="absolute inset-0 size-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-white via-white/75 to-ink/80" />
          <div className="relative px-8 pb-10 pt-14 lg:px-14">
            <p className="eyebrow"><span className="h-0.5 w-6 rounded-full bg-sun" />Locations</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-5xl">
              Prime Locations
              <br />
              <span className="text-brand">Near Top Universities</span>
            </h2>
            <Link to="/listings" className="btn-brand group mt-8">Explore by university {Icon.arrow}</Link>
            <div className="mt-32 grid gap-4 sm:grid-cols-3">
              {[
                [Icon.cap, 'Nearby Campuses', 'Walk or ride to class'],
                [Icon.bus, 'Accessible Transit', 'Close to bus routes'],
                [Icon.pin, 'Vibrant Communities', 'Shops, cafés and more'],
              ].map(([icon, label, sub]) => (
                <div key={label as string} className="flex items-center gap-4 rounded-2xl border border-white/15 bg-white/10 p-4 text-white backdrop-blur-md">
                  <span className="grid size-11 place-items-center rounded-xl bg-white/15">{icon}</span>
                  <div>
                    <p className="font-bold">{label}</p>
                    <p className="text-xs text-white/70">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* "More Than a Place to Stay" */}
      <section className="container-page grid items-center gap-14 pb-24 lg:grid-cols-2">
        <div className="relative">
          <Blob className="-left-6 -top-6 -z-10 size-28" />
          <img src={PHOTOS.students} alt="Students studying together" className="aspect-[4/3] w-full rounded-[2.5rem] object-cover shadow-lift" />
        </div>
        <div>
          <SectionHeader eyebrow="Community" lead="More Than" accent="a Place to Stay" lede="A community of students, for students. Be near your classes, friends, and opportunities." />
          <ul className="-mt-4 space-y-3">
            {['Transparent monthly rent and deposits', 'Book specific rooms, not just buildings', 'Reviews only from students who stayed'].map((t) => (
              <li key={t} className="flex items-center gap-3 text-sm font-medium">
                <span className="grid size-6 place-items-center rounded-full bg-brand-50 text-brand">{Icon.check}</span>
                {t}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            {user ? (
              <>
                <Link to="/listings" className="btn-brand group">Browse listings {Icon.arrow}</Link>
                <Link to="/dashboard" className="btn-ghost">{dashboardLabel}</Link>
              </>
            ) : (
              <>
                <Link to="/register" className="btn-brand">Join BoardMate</Link>
                <Link to="/register?role=OWNER" className="btn-ghost">List your property</Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container-page pb-24">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-brand px-8 py-16 text-white shadow-lift lg:px-16">
          {/* Kept in the corner, clear of the buttons. */}
          <Blob className="-right-16 -top-16 size-36" />
          <Blob color="bg-white/10" className="-bottom-24 left-1/3 size-56" />
          <div className="relative grid items-center gap-8 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <h2 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
                Find. Book. <span className="text-sun">Move In.</span>
              </h2>
              <p className="mt-4 max-w-md text-white/80">
                {user
                  ? 'Your next chapter starts here. Pick up where you left off.'
                  : 'Your next chapter starts here. Create a free account and start your search in minutes.'}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link to="/listings" className="btn-sun group">Start browsing {Icon.arrow}</Link>
              <Link
                to={user ? '/dashboard' : '/register'}
                className="btn border border-white/30 bg-brand-dark/40 text-white backdrop-blur hover:bg-white/10"
              >
                {user ? dashboardLabel : 'Create account'}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
