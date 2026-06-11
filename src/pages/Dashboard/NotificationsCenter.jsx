import { useCollection } from '../../hooks/useDb';
import { db } from '../../services';
import { PageHeader, Card, Button, Badge } from '../../components/ui/ui-components';
import { Bell, Check, Trash2, MailOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

export default function NotificationsCenter() {
  const { user } = useAuth();
  const notifications = useCollection('notifications').sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = async (id) => {
    try {
      await db.secureUpdateDoc('notifications', id, { read: true }, user, 'Marked notification as read');
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unread = notifications.filter(n => !n.read);
      for (const n of unread) {
        await db.secureUpdateDoc('notifications', n.id, { read: true }, user, 'Marked notification as read');
      }
      toast.success('All notifications marked as read');
    } catch (err) {
      toast.error('Failed to update notifications');
    }
  };

  const deleteNotification = async (id) => {
    // Soft delete by archiving, but usually notifications are just deleted.
    try {
      await db.secureUpdateDoc('notifications', id, { status: 'archived' }, user, 'Archived notification');
      toast.success('Notification removed');
    } catch (err) {
      console.error(err);
    }
  };

  const activeNotifications = notifications.filter(n => n.status !== 'archived');

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
      <PageHeader 
        title="Notifications Center" 
        subtitle={`You have ${unreadCount} unread notifications.`} 
        actions={
          unreadCount > 0 && (
            <Button variant="secondary" icon={Check} onClick={markAllAsRead}>
              Mark All as Read
            </Button>
          )
        }
      />

      <Card noPadding>
        {activeNotifications.length === 0 ? (
          <div className="p-12 text-center text-[var(--text-secondary)]">
            <Bell className="mx-auto w-12 h-12 mb-3 text-[var(--border)]" />
            <p>You're all caught up!</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {activeNotifications.map(n => (
              <div key={n.id} className={`p-4 flex gap-4 items-start transition-colors ${!n.read ? 'bg-[var(--brand-light)]/30' : 'hover:bg-[var(--bg-secondary)]'}`}>
                <div className={`mt-1 p-2 rounded-full ${!n.read ? 'bg-[var(--brand)] text-white' : 'bg-[var(--bg-surface)] text-[var(--text-tertiary)]'}`}>
                  {!n.read ? <Bell className="w-4 h-4" /> : <MailOpen className="w-4 h-4" />}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className={`text-sm ${!n.read ? 'font-bold text-[var(--text-primary)]' : 'font-medium text-[var(--text-secondary)]'}`}>
                      {n.title}
                    </h4>
                    <span className="text-xs text-[var(--text-tertiary)] whitespace-nowrap ml-4">
                      {new Date(n.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)]">{n.message}</p>
                  
                  {n.type && (
                    <div className="mt-2">
                      <Badge type={n.type === 'warning' ? 'rejected' : 'default'} text={n.type.toUpperCase()} />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!n.read && (
                    <button onClick={() => markAsRead(n.id)} className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--brand)] rounded" title="Mark as read">
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => deleteNotification(n.id)} className="p-1.5 text-[var(--text-secondary)] hover:text-rose-600 rounded" title="Remove">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
