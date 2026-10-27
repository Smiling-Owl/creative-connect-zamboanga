import { useId } from 'react';
import { Link } from 'react-router';
import type { InAppNotice } from '../domain/selectors';
import { NOTIFICATION_LABEL } from '../labels';

// One rendering for every persona's in-app notification examples (creative home, coordinator workspace, council overview).
// The notices come from domain/selectors.ts `noticesFor`; this component only displays them.

export function NotificationList({
  notices,
  title = 'Notifications',
  emptyText = 'No notifications yet.',
}: {
  notices: InAppNotice[];
  title?: string;
  emptyText?: string;
}) {
  const headingId = useId();
  return (
    <section className="public-card notification-panel" aria-labelledby={headingId}>
      <h2 id={headingId}>{title}</h2>
      <p className="muted">{NOTIFICATION_LABEL}</p>
      {notices.length ? (
        <ul className="notification-list">
          {notices.map((notice) => (
            <li key={notice.id}>
              <span>{notice.to ? <Link to={notice.to}>{notice.text}</Link> : notice.text}</span>
              <time dateTime={notice.at}>{notice.at.slice(0, 10)}</time>
            </li>
          ))}
        </ul>
      ) : (
        <p>{emptyText}</p>
      )}
    </section>
  );
}
