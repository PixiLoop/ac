'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '../../../components/layout/AdminShell';

type ActivityEvent = {
  type: string;
  message: string;
  timestamp: string;
  user?: {
    id: string;
    email?: string;
  };
};

const typeColor: Record<string, string> = {
  USER_CREATED: 'text-emerald-600',
  USER_UPDATED: 'text-blue-600',
  LOGIN: 'text-indigo-600',
  LOGOUT: 'text-slate-600',
  DEFAULT: 'text-slate-700',
};

export default function DashboardPage() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/events`;
    //const url = 'http://127.0.0.1:4000/api/events';
    const source = new EventSource(url, { withCredentials: true });

    source.onopen = () => {
      setConnected(true);
    };

    source.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("Activity Event data", data)
      setEvents((prev) => [data, ...prev].slice(0, 100));
    };

    source.onerror = (err) => {
      console.error('SSE error', err);
      setConnected(false);
      source.close();
    };

    return () => source.close();
  }, []);

  return (
    <AdminShell
      title="Dashboard"
      subtitle="Live system activity and updates"
      helpKey="dashboard"
    >
      <div className="space-y-6">
        {/* Status bar */}
        <div className="flex items-center gap-2 text-sm">
          <span
            className={`h-2 w-2 rounded-full ${
              connected ? 'bg-emerald-500' : 'bg-rose-500'
            }`}
          />
          <span className="text-slate-600">
            {connected ? 'Live updates connected' : 'Disconnected'}
          </span>
        </div>

        {/* Activity feed */}
        <section className="bg-white rounded-xl shadow-card overflow-hidden">
          <div className="border-b px-5 py-3 text-sm font-semibold text-slate-700">
            Recent activity
          </div>

          {events.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">
              Waiting for activity…
            </div>
          ) : (
            <ul className="divide-y">
              {events.map((e, idx) => {
                const color = typeColor[e.type] ?? typeColor.DEFAULT;

                return (
                  <li key={idx} className="px-5 py-4 hover:bg-slate-50">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className={`text-sm font-medium ${color}`}>
                          {e.type.replace(/_/g, ' ')}
                        </div>
                        <div className="text-sm text-slate-700 mt-1">
                          {e.message}
                        </div>

                        {e.user?.email && (
                          <div className="text-xs text-slate-500 mt-1">
                            User: {e.user.email}
                          </div>
                        )}
                      </div>

                      <div className="text-xs text-slate-400 whitespace-nowrap">
                        {new Date(e.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </AdminShell>
  );
}
