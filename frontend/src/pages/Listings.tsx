import { useSearchParams } from 'react-router-dom'
import { PROPERTY_TYPES, prettyEnum, qs, type Pagination, type PropertySummary } from '../api'
import { Select } from '../Select'
import { CardSkeleton, Empty, ErrorBox, Icon, PageHeader, PropertyCard, universityOptions, useApi, useUniversities } from '../components'

const TYPE_OPTIONS = [{ value: '', label: 'Any type' }, ...PROPERTY_TYPES.map((t) => ({ value: t, label: prettyEnum(t) }))]

const FILTERS = ['search', 'city', 'propertyType', 'universityId', 'minRent', 'maxRent', 'sortBy', 'page'] as const

export default function Listings() {
  const [params, setParams] = useSearchParams()
  const query = Object.fromEntries(FILTERS.map((k) => [k, params.get(k) ?? undefined]))
  const { data, error, loading } = useApi<{ properties: PropertySummary[]; pagination: Pagination }>(
    `/properties${qs({ ...query, limit: 12 })}`,
  )
  const unis = useUniversities()
  const activeCount = FILTERS.filter((k) => k !== 'page' && k !== 'sortBy' && query[k]).length

  const apply = (form: HTMLFormElement) => {
    const next = new URLSearchParams()
    new FormData(form).forEach((v, k) => v && next.set(k, String(v)))
    setParams(next)
  }
  const setOne = (key: string, value: string) => {
    if (value) params.set(key, value)
    else params.delete(key)
    params.delete('page')
    setParams(params)
  }
  const goto = (page: number) => {
    params.set('page', String(page))
    setParams(params)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <>
      <PageHeader eyebrow="Browse" title="Live Closer to" accent="What Matters" lede="Rooms, apartments and boarding houses near your campus. All verified." />

      <div className="container-page py-10">
        <form
          // Remount when universities arrive so the University select picks up its defaultValue.
          key={`${params.toString()}|${unis.list.length}`}
          className="card -mt-20 relative z-10 grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.3fr_auto] lg:items-end"
          onSubmit={(e) => {
            e.preventDefault()
            apply(e.currentTarget)
          }}
        >
          <label>
            <span className="label">Keyword</span>
            <input name="search" defaultValue={query.search} placeholder="Name, area or feature" className="input" />
          </label>
          <label>
            <span className="label">City</span>
            <input name="city" defaultValue={query.city} placeholder="Any city" className="input" />
          </label>
          <div>
            <span className="label">Type</span>
            <Select name="propertyType" label="Type" defaultValue={query.propertyType ?? ''} options={TYPE_OPTIONS} />
          </div>
          <div>
            <span className="label">University</span>
            <Select
              name="universityId"
              label="University"
              searchable
              icon={Icon.cap}
              defaultValue={query.universityId ?? ''}
              options={universityOptions(unis.list, 'Any university')}
              loading={unis.loading} error={unis.error} onRetry={unis.retry}
            />
          </div>
          <button className="btn-brand !py-3 sm:col-span-2 lg:col-span-1">{Icon.search} Search</button>
          <div className="flex flex-wrap items-end gap-3 border-t border-line pt-4 sm:col-span-2 lg:col-span-5">
            <fieldset className="flex items-end gap-2">
              <legend className="label">Monthly rent (LKR)</legend>
              <input name="minRent" type="number" min={0} defaultValue={query.minRent} placeholder="Min" aria-label="Minimum rent" className="input !w-32" />
              <span className="pb-2.5 text-muted">–</span>
              <input name="maxRent" type="number" min={0} defaultValue={query.maxRent} placeholder="Max" aria-label="Maximum rent" className="input !w-32" />
            </fieldset>
            <input type="hidden" name="sortBy" value={query.sortBy ?? ''} />
            {activeCount > 0 && (
              <button type="button" onClick={() => setParams({})} className="ml-auto pb-2.5 text-sm font-semibold text-muted hover:text-brand">
                Clear {activeCount} filter{activeCount > 1 ? 's' : ''}
              </button>
            )}
          </div>
        </form>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-muted">
            {data ? (
              <><span className="font-bold text-ink">{data.pagination.total}</span> place{data.pagination.total === 1 ? '' : 's'} found</>
            ) : ' '}
          </p>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold text-muted">Sort by</span>
            <Select
              label="Sort by"
              align="right"
              className="w-52"
              value={query.sortBy ?? 'newest'}
              onChange={(v) => setOne('sortBy', v)}
              options={[
                { value: 'newest', label: 'Newest' },
                { value: 'price_asc', label: 'Price: low to high' },
                { value: 'price_desc', label: 'Price: high to low' },
              ]}
            />
          </div>
        </div>

        <div className="mt-6">
          {loading ? (
            <CardSkeleton count={6} />
          ) : error ? (
            <ErrorBox msg={error} />
          ) : !data?.properties.length ? (
            <Empty icon={Icon.search}>No properties match your filters. Try a different city or a wider price range.</Empty>
          ) : (
            <>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {data.properties.map((p) => <PropertyCard key={p.id} p={p} />)}
              </div>
              {data.pagination.totalPages > 1 && (
                <nav className="mt-12 flex items-center justify-center gap-2" aria-label="Pagination">
                  <button className="btn-ghost" disabled={data.pagination.page <= 1} onClick={() => goto(data.pagination.page - 1)}>← Previous</button>
                  {Array.from({ length: data.pagination.totalPages }, (_, i) => i + 1)
                    .filter((n) => Math.abs(n - data.pagination.page) <= 2)
                    .map((n) => (
                      <button
                        key={n}
                        onClick={() => goto(n)}
                        aria-current={n === data.pagination.page ? 'page' : undefined}
                        className={`grid size-10 place-items-center rounded-full text-sm font-bold transition ${n === data.pagination.page ? 'bg-brand text-white' : 'hover:bg-brand-50 hover:text-brand'}`}
                      >
                        {n}
                      </button>
                    ))}
                  <button className="btn-ghost" disabled={data.pagination.page >= data.pagination.totalPages} onClick={() => goto(data.pagination.page + 1)}>Next →</button>
                </nav>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
