import React from 'react';
import { useCrowdStore } from '../store/useCrowdStore';

export default function NotificationsDrawer() {
  const {
    notifications,
    showNotificationsDrawer,
    setShowNotificationsDrawer,
    markAllNotificationsRead,
    dismissNotification,
    setPage
  } = useCrowdStore();

  if (!showNotificationsDrawer) return null;

  return (
    <div className="notifications-drawer-backdrop" onClick={() => setShowNotificationsDrawer(false)}>
      <div className="notifications-drawer-panel" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <div>
            <h3>Active Safety Alerts ({notifications.filter(n => n.unread).length} Unread)</h3>
            <p>Real-time threshold breaches & LSTM forecast warnings</p>
          </div>
          <button className="close-btn" onClick={() => setShowNotificationsDrawer(false)}>✕</button>
        </div>

        <div className="drawer-actions-row">
          <button className="text-button" onClick={markAllNotificationsRead}>
            Mark all read
          </button>
          <button className="text-button" onClick={() => { setPage('Incidents'); setShowNotificationsDrawer(false); }}>
            Open Incident Center →
          </button>
        </div>

        <div className="drawer-notifications-list">
          {notifications.length === 0 ? (
            <div className="empty-notifs">
              <span className="status-dot green" /> No active alarms
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                className={`drawer-notif-card ${item.unread ? 'unread' : ''}`}
                onClick={() => { setPage('Incidents'); setShowNotificationsDrawer(false); }}
              >
                <div className="notif-top">
                  <span className={`incident-mark ${item.level === 'Critical' ? 'red' : item.level === 'Warning' ? 'amber' : 'green'}`}>
                    {item.level === 'Critical' ? '!' : item.level === 'Warning' ? '▲' : 'ℹ'}
                  </span>
                  <b>{item.title}</b>
                  <button
                    className="dismiss-btn"
                    onClick={(e) => { e.stopPropagation(); dismissNotification(item.id); }}
                    title="Dismiss"
                  >
                    ×
                  </button>
                </div>
                <div className="notif-foot">
                  <span>⏱ {item.time}</span>
                  <span className={`incident-status ${item.level === 'Critical' ? 'red' : item.level === 'Warning' ? 'amber' : 'green'}`}>
                    {item.level}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
