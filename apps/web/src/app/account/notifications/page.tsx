import { NotificationSettings } from '../../../components/NotificationSettings';

export const metadata = {
  title: 'Notifications',
  description: 'Choose which updates you get, on which channels, and when.',
};

/**
 * `/account/notifications` — the engagement notification preference centre (pack doc 05),
 * gated on `engagementV3` inside the client component.
 */
export default function NotificationsPage() {
  return (
    <div className="container-page py-12">
      <h1 className="mb-6 font-serif text-3xl font-bold text-bone">Notifications</h1>
      <NotificationSettings />
    </div>
  );
}
