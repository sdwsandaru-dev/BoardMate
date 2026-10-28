import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth'
import { Blob, ErrorBox, Headline, Icon, PHOTOS } from '../components'

function PasswordInput(props: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'name'>) {
  const [show, setShow] = useState(false)
  return (
    <span className="relative block">
      <input {...props} name="password" type={show ? 'text' : 'password'} required className="input !pr-12" />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? 'Hide password' : 'Show password'}
        aria-pressed={show}
        title={show ? 'Hide password' : 'Show password'}
        className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-muted transition hover:bg-black/5 hover:text-brand"
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
          <circle cx="12" cy="12" r="3" />
          {show && <path d="M3 3l18 18" />}
        </svg>
      </button>
    </span>
  )
}

function Shell({ title, accent, lede, children }: { title: string; accent: string; lede: string; children: React.ReactNode }) {
  return (
    <div className="container-page grid items-stretch gap-10 py-10 lg:grid-cols-2 lg:py-16">
      <div className="mx-auto flex w-full max-w-md flex-col justify-center">
        <Headline lead={title} accent={accent} />
        <p className="mt-4 text-muted">{lede}</p>
        <div className="mt-8">{children}</div>
      </div>
      <div className="relative hidden overflow-hidden rounded-[2.5rem] shadow-lift lg:block">
        <img src={PHOTOS.room2} alt="" className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand via-brand/40 to-transparent" />
        <Blob className="-right-10 -top-10 size-36" />
        <div className="absolute inset-x-0 bottom-0 p-10 text-white">
          <p className="text-3xl font-extrabold leading-tight">Comfortable Spaces for <span className="text-sun">Brighter Days</span></p>
          <ul className="mt-6 space-y-3 text-sm">
            {['Verified rooms, apartments and boarding houses', 'Book online and track every request', 'Honest reviews from fellow students'].map((t) => (
              <li key={t} className="flex items-center gap-3">
                <span className="grid size-6 place-items-center rounded-full bg-sun text-ink">{Icon.check}</span>
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

function useSubmit(fn: (f: FormData) => Promise<unknown>) {
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await fn(new FormData(e.currentTarget))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return { error, busy, onSubmit }
}

export function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/dashboard'
  const { error, busy, onSubmit } = useSubmit(async (f) => {
    await login(String(f.get('email')), String(f.get('password')))
    navigate(from, { replace: true })
  })
  return (
    <Shell title="Welcome" accent="Back" lede="Log in to manage your bookings, saved places and listings.">
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <ErrorBox msg={error} />}
        <label className="block"><span className="label">Email</span><input name="email" type="email" required placeholder="you@university.edu" autoComplete="email" className="input" /></label>
        <label className="block"><span className="label">Password</span><PasswordInput placeholder="Your password" autoComplete="current-password" /></label>
        <button disabled={busy} className="btn-sun w-full">{busy ? 'Logging in…' : 'Log in'}</button>
        <p className="text-center text-sm text-black/60">
          New here? <Link to="/register" className="font-bold text-brand">Create an account</Link>
        </p>
      </form>
    </Shell>
  )
}

export function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [role, setRole] = useState<'STUDENT' | 'OWNER'>(params.get('role') === 'OWNER' ? 'OWNER' : 'STUDENT')
  const { error, busy, onSubmit } = useSubmit(async (f) => {
    const phone = String(f.get('phone') || '').trim()
    await register({
      fullName: String(f.get('fullName')),
      email: String(f.get('email')),
      password: String(f.get('password')),
      phone: phone || undefined,
      role,
    })
    navigate('/dashboard', { replace: true })
  })
  return (
    <Shell title="Your Next Chapter" accent="Starts Here" lede="Create a free account in under a minute.">
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <ErrorBox msg={error} />}
        <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Account type">
          {(['STUDENT', 'OWNER'] as const).map((r) => (
            <button
              type="button"
              key={r}
              role="radio"
              aria-checked={role === r}
              onClick={() => setRole(r)}
              className={`rounded-2xl border-2 p-4 text-left transition ${role === r ? 'border-brand bg-brand-50' : 'border-line bg-white hover:border-brand/30'}`}
            >
              <span className={`grid size-9 place-items-center rounded-xl ${role === r ? 'bg-brand text-white' : 'bg-brand-50 text-brand'} [&_svg]:size-5`}>
                {r === 'STUDENT' ? Icon.cap : Icon.home}
              </span>
              <span className="mt-3 block text-sm font-bold">{r === 'STUDENT' ? "I'm a student" : "I'm an owner"}</span>
              <span className="block text-xs text-muted">{r === 'STUDENT' ? 'Find and book a place' : 'List my property'}</span>
            </button>
          ))}
        </div>
        <label className="block"><span className="label">Full name</span><input name="fullName" required minLength={2} maxLength={100} placeholder="Your full name" autoComplete="name" className="input" /></label>
        <label className="block"><span className="label">Email</span><input name="email" type="email" required placeholder="you@university.edu" autoComplete="email" className="input" /></label>
        <label className="block"><span className="label">Phone (optional)</span><input name="phone" type="tel" maxLength={30} placeholder="07X XXX XXXX" autoComplete="tel" className="input" /></label>
        <label className="block"><span className="label">Password</span><PasswordInput minLength={8} maxLength={128} placeholder="At least 8 characters" autoComplete="new-password" /></label>
        <button disabled={busy} className="btn-sun w-full">{busy ? 'Creating account…' : 'Create account'}</button>
        <p className="text-center text-sm text-black/60">
          Already have an account? <Link to="/login" className="font-bold text-brand">Log in</Link>
        </p>
      </form>
    </Shell>
  )
}
