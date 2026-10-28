import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'

export type SelectOption = { value: string; label: string; hint?: string }

type Props = {
  options: SelectOption[]
  /** Accessible name; also used as the search placeholder context. */
  label: string
  /** Shown when the current value matches no option (e.g. "" with no "Any" option). */
  placeholder?: string
  /** Form field name; submits through a hidden input like a native select. */
  name?: string
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  /** Adds a filter box at the top of the list. */
  searchable?: boolean
  icon?: ReactNode
  /** "input" looks like the site's text fields; "bare" blends into a parent (home search bar). */
  variant?: 'input' | 'bare'
  align?: 'left' | 'right'
  className?: string
  /** Options are still being fetched. */
  loading?: boolean
  /** Fetching options failed; shown in the list with a Retry button when onRetry is given. */
  error?: string | null
  onRetry?: () => void
}

/**
 * Themed replacement for <select>: the native dropdown list is drawn by the OS and can't be styled.
 * Keyboard: Enter/Space/ArrowDown open, arrows move, Enter picks, Esc closes, typing jumps or filters.
 */
export function Select({
  options,
  label,
  placeholder = 'Select…',
  name,
  value,
  defaultValue = '',
  onChange,
  searchable = false,
  icon,
  variant = 'input',
  align = 'left',
  className = '',
  loading = false,
  error = null,
  onRetry,
}: Props) {
  const [inner, setInner] = useState(defaultValue)
  const current = value ?? inner
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const list = useRef<HTMLUListElement>(null)
  const search = useRef<HTMLInputElement>(null)
  const id = useId()

  const selected = options.find((o) => o.value === current)
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? options.filter((o) => `${o.label} ${o.hint ?? ''}`.toLowerCase().includes(q)) : options
  }, [options, query])

  const show = () => {
    setQuery('')
    setActive(Math.max(0, options.findIndex((o) => o.value === current)))
    setOpen(true)
  }
  const close = (refocus = true) => {
    setOpen(false)
    if (refocus) trigger.current?.focus()
  }
  const pick = (o: SelectOption) => {
    if (value === undefined) setInner(o.value)
    onChange?.(o.value)
    close()
  }

  // Close when clicking anywhere else.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => !root.current?.contains(e.target as Node) && close(false)
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  // Focus the search box (or the list) on open, and keep the active option in view.
  useEffect(() => {
    if (open) (searchable ? search.current : list.current)?.focus()
  }, [open, searchable])
  useEffect(() => {
    if (open) list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active, open])

  const onListKey = (e: KeyboardEvent) => {
    const last = shown.length - 1
    if (e.key === 'ArrowDown') setActive((a) => Math.min(last, a + 1))
    else if (e.key === 'ArrowUp') setActive((a) => Math.max(0, a - 1))
    else if (e.key === 'Home') setActive(0)
    else if (e.key === 'End') setActive(last)
    else if (e.key === 'Enter' && shown[active]) pick(shown[active])
    else if (e.key === 'Escape') close()
    else if (e.key === 'Tab') return close(false)
    else if (!searchable && e.key.length === 1) {
      // Type-ahead: jump to the first option starting with the typed letter.
      const i = shown.findIndex((o) => o.label.toLowerCase().startsWith(e.key.toLowerCase()))
      if (i >= 0) setActive(i)
      return
    } else return
    e.preventDefault()
  }

  const triggerStyle =
    variant === 'bare'
      ? 'w-full rounded-full px-4 py-2 hover:text-brand'
      : `input flex !pr-3 ${open ? '!border-brand ring-4 ring-brand/10' : ''}`

  return (
    <div ref={root} className={`relative ${className}`}>
      {name && <input type="hidden" name={name} value={current} />}
      <button
        ref={trigger}
        type="button"
        aria-label={selected ? `${label}: ${selected.label}` : label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        onClick={() => (open ? close() : show())}
        onKeyDown={(e) => {
          if (!open && ['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
            e.preventDefault()
            show()
          }
        }}
        className={`flex items-center gap-2 text-left text-sm transition ${triggerStyle}`}
      >
        {icon && <span className={`shrink-0 [&_svg]:size-5 ${open || selected?.value ? 'text-brand' : 'text-muted'}`}>{icon}</span>}
        <span className={`min-w-0 flex-1 truncate ${selected ? 'text-ink' : 'text-muted/70'}`}>{selected?.label ?? placeholder}</span>
        <svg viewBox="0 0 24 24" className={`size-4 shrink-0 text-muted transition duration-200 ${open ? 'rotate-180 text-brand' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          className={`absolute top-full z-40 mt-2 w-max min-w-full max-w-[min(26rem,calc(100vw-2rem))] animate-fade-up overflow-hidden rounded-2xl border border-line bg-white shadow-lift ${align === 'right' ? 'right-0' : 'left-0'}`}
        >
          {searchable && (
            <div className="border-b border-line p-2">
              <div className="flex items-center gap-2 rounded-xl bg-cream px-3 py-2 text-muted focus-within:text-brand focus-within:ring-2 focus-within:ring-brand/20">
                <svg viewBox="0 0 24 24" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" strokeLinecap="round" />
                </svg>
                <input
                  ref={search}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value)
                    setActive(0)
                  }}
                  onKeyDown={onListKey}
                  placeholder={`Search ${label.toLowerCase()}…`}
                  aria-label={`Search ${label.toLowerCase()}`}
                  aria-controls={`${id}-list`}
                  aria-activedescendant={shown[active] ? `${id}-opt-${active}` : undefined}
                  className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted/70"
                />
              </div>
            </div>
          )}
          <ul
            ref={list}
            id={`${id}-list`}
            role="listbox"
            aria-label={label}
            tabIndex={-1}
            onKeyDown={onListKey}
            aria-activedescendant={shown[active] ? `${id}-opt-${active}` : undefined}
            className="thin-scroll max-h-72 overflow-y-auto overscroll-contain p-1.5 outline-none"
          >
            {shown.length ? (
              shown.map((o, i) => {
                const isSel = o.value === current
                return (
                  <li
                    key={o.value}
                    id={`${id}-opt-${i}`}
                    data-index={i}
                    role="option"
                    aria-selected={isSel}
                    onMouseEnter={() => setActive(i)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pick(o)}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${i === active ? 'bg-brand-50' : ''} ${isSel ? 'font-bold text-brand' : 'text-ink'}`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{o.label}</span>
                      {o.hint && <span className="block truncate text-xs font-normal text-muted">{o.hint}</span>}
                    </span>
                    <svg viewBox="0 0 24 24" className={`size-4 shrink-0 ${isSel ? 'text-brand' : 'invisible'}`} fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden>
                      <path d="m5 12 4.5 4.5L19 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </li>
                )
              })
            ) : (
              <li className="px-3 py-6 text-center text-sm text-muted">No matches for “{query}”</li>
            )}
            {loading && (
              <li role="status" className="flex items-center gap-2 px-3 py-3 text-sm text-muted">
                <span className="size-4 animate-spin rounded-full border-2 border-brand/20 border-t-brand" aria-hidden />
                Loading {label.toLowerCase()} list…
              </li>
            )}
            {error && !loading && (
              <li role="alert" className="m-1 flex items-center justify-between gap-3 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700">
                <span>Couldn't load the list.</span>
                {onRetry && (
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={onRetry} className="font-bold underline underline-offset-2 hover:text-red-900">
                    Retry
                  </button>
                )}
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
