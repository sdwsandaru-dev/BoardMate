import { useState } from 'react'
import { api, type Notification, type Pagination } from '../api'
import { Empty, ErrorBox, Icon, PageHeader, Spinner, useApi } from '../components'

const timeAgo = (iso: string) => {
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`
  if (s < 604800) return `${Math.floor(s / 86400)} d ago`
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' })
}

export default function Notifications() {
  const [unreadOnly, setUnreadOnly] = useState(false)
  const { data, error, loading, reload } = useApi<{ notifications: Notification[]; unreadCount: number; pagination: Pagination }>(
    `/notifications?limit=50&unreadOnly=${unreadOnly}`,
  )
  const run = (path: string, method: string) => api(path, { method }).then(reload, (e: Error) => alert(e.message))

  return (
    <>
      <PageHeader
        eyebrow="Inbox"
        title="Your"
        accent="Notifications"
        lede={data ? (data.unreadCount ? `You have ${data.unreadCount} unread notification${data.unreadCount === 1 ? '' : 's'}.` : "You're all caught up.") : undefined}
        action={!!data?.unreadCount && <button className="btn-ghost" onClick={() => run('/notifications/read-all', 'PATCH')}>{Icon.check} Mark all as read</button>}
      />
      <div className="container-page max-w-3xl py-10">
        <div className="mb-6 inline-flex rounded-full border border-line bg-white p-1" role="tablist" aria-label="Filter notifications">
          {[false, true].map((v) => (
            <button
              key={String(v)}
              role="tab"
              aria-selected={unreadOnly === v}
              onClick={() => setUnreadOnly(v)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${unreadOnly === v ? 'bg-brand text-white' : 'text-muted hover:text-brand'}`}
            >
              {v ? 'Unread' : 'All'}
            </button>
          ))}
        </div>
        <div className="card divide-y divide-line overflow-hidden">
          {loading ? <Spinner /> : error ? <div className="p-5"><ErrorBox msg={error} /></div> : data?.notifications.length ? (
            data.notifications.map((n) => (
              <div key={n.id} className={`group flex gap-4 p-5 transition hover:bg-cream/50 ${n.isRead ? '' : 'bg-brand-50/40'}`}>
                <span className={`grid size-10 shrink-0 place-items-center rounded-full ${n.isRead ? 'bg-black/[0.04] text-muted' : 'bg-sun text-ink'}`}>{Icon.bell}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <p className={n.isRead ? 'font-semibold' : 'font-bold'}>{n.title}</p>
                    <time dateTime={n.createdAt} className="text-xs text-muted">{timeAgo(n.createdAt)}</time>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{n.message}</p>
                  <div className="mt-3 flex gap-4 text-xs font-semibold">
                    {!n.isRead && <button className="text-brand hover:underline" onClick={() => run(`/notifications/${n.id}/read`, 'PATCH')}>Mark as read</button>}
                    <button className="text-muted hover:text-red-600" onClick={() => run(`/notifications/${n.id}`, 'DELETE')}>Delete</button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-5"><Empty icon={Icon.bell}>{unreadOnly ? 'No unread notifications.' : "You're all caught up. We'll let you know when something changes."}</Empty></div>
          )}
        </div>
      </div>
    </>
  )
}
