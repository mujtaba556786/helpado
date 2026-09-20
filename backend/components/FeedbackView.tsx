import React, { useState, useEffect, useCallback } from 'react';
import { ICONS } from '../constants';
import { apiService } from '../services/api';

type FeedbackStatus = 'new' | 'read' | 'done';
type Filter = 'all' | FeedbackStatus;

const TYPE_LABELS: Record<string, string> = { idea: '💡 Idea', problem: '⚠️ Problem', praise: '💚 Praise' };

const statusBadge = (status: string) => {
  switch (status) {
    case 'new':  return 'bg-emerald-100 text-emerald-800';
    case 'read': return 'bg-blue-100 text-blue-800';
    case 'done': return 'bg-slate-200 text-slate-600';
    default:     return 'bg-slate-100 text-slate-600';
  }
};

/**
 * In-app feedback from Settings → Support → "Give feedback". Read-only list
 * with a three-state workflow (new → read → done). Nothing here is visible to
 * users; the sender's name/email come from the users table via the API.
 */
const FeedbackView: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await apiService.getFeedback(filter === 'all' ? undefined : filter);
    setItems(data);
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const setStatus = async (id: string | number, status: FeedbackStatus) => {
    setBusy(String(id));
    const ok = await apiService.setFeedbackStatus(id, status);
    if (ok) setItems(prev => prev.map(f => String(f.id) === String(id) ? { ...f, status } : f));
    setBusy(null);
  };

  const newCount = items.filter(f => f.status === 'new').length;

  return (
    <div className="space-y-6">
      <div className="bg-emerald-900 text-white p-6 rounded-3xl shadow-xl flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black italic">Feedback</h2>
          <p className="text-emerald-200 text-sm">Ideas, problems and praise sent from the app's Settings screen.</p>
        </div>
        <div className="text-right">
          <p className="text-4xl font-black">{newCount}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-300">Unread</p>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {(['all', 'new', 'read', 'done'] as Filter[]).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-colors ${
              filter === f ? 'bg-emerald-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}>
            {f}
          </button>
        ))}
        <button onClick={load} className="ml-auto px-4 py-2 rounded-xl text-xs font-black bg-white border border-slate-200 text-slate-600 hover:bg-slate-50">
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400 font-semibold">Loading…</div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center">
          <ICONS.Chat className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-semibold">No feedback yet</p>
          <p className="text-slate-400 text-sm">Messages sent via Settings → Support → Give feedback will appear here.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {items.map(f => (
            <div key={f.id} className={`bg-white rounded-3xl border p-5 ${f.status === 'new' ? 'border-emerald-200 shadow-sm' : 'border-slate-100 opacity-90'}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${statusBadge(f.status)}`}>{f.status}</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">{TYPE_LABELS[f.type] || f.type}</span>
                    <span className="text-[10px] text-slate-400 font-semibold">#{f.id}</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    <span className="font-bold text-slate-700">{f.user_name || 'Unknown user'}</span>
                    {f.user_email ? <span className="text-slate-400"> · {f.user_email}</span> : null}
                    {f.app_build ? <span className="text-slate-400"> · build {f.app_build}</span> : null}
                    {f.platform ? <span className="text-slate-400"> · {f.platform}</span> : null}
                  </p>
                </div>
                <span className="text-xs text-slate-400 whitespace-nowrap">
                  {new Date(f.created_at).toLocaleString('de-DE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <p className="text-sm text-slate-700 bg-slate-50 rounded-xl p-3 mb-4 whitespace-pre-wrap">{f.message}</p>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                {f.status !== 'read' && f.status !== 'done' && (
                  <button onClick={() => setStatus(f.id, 'read')} disabled={busy === String(f.id)}
                    className="px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-xs font-black hover:bg-blue-100 disabled:opacity-50">Mark read</button>
                )}
                {f.status !== 'done' && (
                  <button onClick={() => setStatus(f.id, 'done')} disabled={busy === String(f.id)}
                    className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-black hover:bg-emerald-100 disabled:opacity-50">Done</button>
                )}
                {f.status === 'done' && (
                  <button onClick={() => setStatus(f.id, 'new')} disabled={busy === String(f.id)}
                    className="px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-xs font-black hover:bg-slate-100 disabled:opacity-50">Reopen</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FeedbackView;
