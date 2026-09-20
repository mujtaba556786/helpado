
import React, { useState, useEffect, useCallback } from 'react';
import { ICONS } from '../constants';
import { apiService } from '../services/api';

type ReportStatus = 'all' | 'pending' | 'reviewed' | 'actioned';

const CATEGORY_LABELS: Record<string, string> = {
  spam: 'Spam',
  harassment: 'Harassment',
  scam_fraud: 'Scam / Fraud',
  inappropriate_content: 'Inappropriate Content',
  fake_profile: 'Fake Profile',
  other: 'Other',
};

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    pending:  'bg-amber-100 text-amber-700',
    reviewed: 'bg-blue-100 text-blue-700',
    actioned: 'bg-green-100 text-green-700',
  };
  return map[status] || 'bg-slate-100 text-slate-500';
};

const riskColor = (score: number) => {
  if (score >= 80) return 'text-red-600 bg-red-50';
  if (score >= 50) return 'text-orange-600 bg-orange-50';
  return 'text-amber-600 bg-amber-50';
};

const TrustSafetyView: React.FC = () => {
  const [tab, setTab] = useState<'reports' | 'flagged' | 'blocks'>('reports');

  // Reports state
  const [reports, setReports] = useState<any[]>([]);
  const [reportFilter, setReportFilter] = useState<ReportStatus>('all');
  const [reportsLoading, setReportsLoading] = useState(true);
  const [actioningReport, setActioningReport] = useState<string | null>(null);
  // Report-scoped conversation viewer. Only the thread between the two parties
  // of one report is ever fetched — there is no "browse all chats".
  const [convoFor, setConvoFor] = useState<any | null>(null);
  const [convoMessages, setConvoMessages] = useState<any[]>([]);
  const [convoLoading, setConvoLoading] = useState(false);
  const [removingMsg, setRemovingMsg] = useState<string | null>(null);

  const openConversation = async (report: any) => {
    setConvoFor(report); setConvoLoading(true); setConvoMessages([]);
    const data = await apiService.getReportConversation(report.id);
    setConvoMessages(data ? data.messages : []);
    setConvoLoading(false);
  };

  const handleRemoveMessage = async (messageId: string) => {
    if (!window.confirm('Remove this message for both participants? The text is replaced by a moderation notice; the record is kept.')) return;
    setRemovingMsg(messageId);
    const ok = await apiService.removeMessage(messageId);
    if (ok) setConvoMessages(prev => prev.map(m => m.id === messageId ? { ...m, content: '', removed: 1 } : m));
    setRemovingMsg(null);
  };

  // Flagged users state
  const [flagged, setFlagged] = useState<any[]>([]);
  const [flaggedLoading, setFlaggedLoading] = useState(true);
  const [actioningUser, setActioningUser] = useState<string | null>(null);

  // Blocks state
  const [blocks, setBlocks] = useState<any[]>([]);
  const [blocksLoading, setBlocksLoading] = useState(true);
  const [removingBlock, setRemovingBlock] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    setReportsLoading(true);
    const status = reportFilter === 'all' ? undefined : reportFilter;
    const data = await apiService.getReports(status);
    setReports(data);
    setReportsLoading(false);
  }, [reportFilter]);

  const loadFlagged = useCallback(async () => {
    setFlaggedLoading(true);
    const data = await apiService.getFlaggedUsers();
    setFlagged(data);
    setFlaggedLoading(false);
  }, []);

  const loadBlocks = useCallback(async () => {
    setBlocksLoading(true);
    const data = await apiService.getBlocks();
    setBlocks(data);
    setBlocksLoading(false);
  }, []);

  useEffect(() => { loadReports(); }, [loadReports]);
  useEffect(() => { loadFlagged(); }, [loadFlagged]);
  useEffect(() => { loadBlocks(); }, [loadBlocks]);

  const handleReportAction = async (id: string, status: 'reviewed' | 'actioned') => {
    setActioningReport(id);
    const ok = await apiService.actionReport(id, status);
    if (ok) {
      setReports(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    }
    setActioningReport(null);
  };

  const handleUserAction = async (userId: string, action: 'warn' | 'restrict' | 'ban' | 'clear') => {
    const labels: Record<string, string> = {
      warn: 'send a warning notification to',
      restrict: 'suspend',
      ban: 'ban',
      clear: 'clear the risk score and restore',
    };
    if (!window.confirm(`Are you sure you want to ${labels[action]} this user?`)) return;
    setActioningUser(userId);
    const ok = await apiService.adminActionUser(userId, action);
    if (ok) {
      if (action === 'ban') {
        setFlagged(prev => prev.map(u => u.id === userId ? { ...u, status: 'Blocked' } : u));
      } else if (action === 'restrict') {
        setFlagged(prev => prev.map(u => u.id === userId ? { ...u, status: 'Suspended' } : u));
      } else if (action === 'clear') {
        setFlagged(prev => prev.map(u => u.id === userId ? { ...u, risk_score: 0, status: 'Active' } : u));
      }
    }
    setActioningUser(null);
  };

  const handleRemoveBlock = async (blockId: string) => {
    if (!window.confirm('Remove this block? Both users will be able to contact each other again.')) return;
    setRemovingBlock(blockId);
    const ok = await apiService.removeBlock(String(blockId));
    if (ok) {
      setBlocks(prev => prev.filter(b => String(b.id) !== String(blockId)));
    }
    setRemovingBlock(null);
  };

  const pendingCount = reports.filter(r => r.status === 'pending').length;
  const flaggedCount = flagged.length;
  const blocksCount  = blocks.length;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="bg-rose-900 text-white p-6 rounded-3xl shadow-xl flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black italic">Trust &amp; Safety</h2>
          <p className="text-rose-200 text-sm">Manage reports, flagged users, and community blocks.</p>
        </div>
        <div className="flex items-center space-x-8">
          <div className="text-right">
            <p className="text-4xl font-black">{pendingCount}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-rose-300">Pending Reports</p>
          </div>
          <div className="text-right">
            <p className="text-4xl font-black">{flaggedCount}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-rose-300">Flagged Users</p>
          </div>
          <div className="text-right">
            <p className="text-4xl font-black">{blocksCount}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-rose-300">Active Blocks</p>
          </div>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex space-x-2 bg-slate-100 p-1 rounded-2xl w-fit">
        <button
          onClick={() => setTab('reports')}
          className={`px-5 py-2 rounded-xl text-sm font-black transition-all ${tab === 'reports' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <span className="flex items-center space-x-2">
            <ICONS.Flag className="w-4 h-4" />
            <span>Reports {pendingCount > 0 && <span className="ml-1 bg-rose-600 text-white text-[10px] font-black rounded-full px-1.5">{pendingCount}</span>}</span>
          </span>
        </button>
        <button
          onClick={() => setTab('flagged')}
          className={`px-5 py-2 rounded-xl text-sm font-black transition-all ${tab === 'flagged' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <span className="flex items-center space-x-2">
            <ICONS.Shield className="w-4 h-4" />
            <span>Flagged Users {flaggedCount > 0 && <span className="ml-1 bg-orange-500 text-white text-[10px] font-black rounded-full px-1.5">{flaggedCount}</span>}</span>
          </span>
        </button>
        <button
          onClick={() => setTab('blocks')}
          className={`px-5 py-2 rounded-xl text-sm font-black transition-all ${tab === 'blocks' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <span className="flex items-center space-x-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
            <span>Blocks {blocksCount > 0 && <span className="ml-1 bg-slate-500 text-white text-[10px] font-black rounded-full px-1.5">{blocksCount}</span>}</span>
          </span>
        </button>
      </div>

      {/* ── REPORTS TAB ── */}
      {tab === 'reports' && (
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            {(['all', 'pending', 'reviewed', 'actioned'] as ReportStatus[]).map(f => (
              <button
                key={f}
                onClick={() => setReportFilter(f)}
                className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border transition-all ${
                  reportFilter === f
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'border-slate-200 text-slate-500 hover:border-slate-400'
                }`}
              >
                {f}
              </button>
            ))}
            <button onClick={loadReports} className="ml-auto text-xs text-slate-400 hover:text-slate-700 font-bold">↻ Refresh</button>
          </div>

          {reportsLoading ? (
            <div className="text-center py-16 text-slate-400 font-semibold">Loading reports…</div>
          ) : reports.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center">
              <ICONS.Flag className="w-10 h-10 mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500 font-semibold">No reports found</p>
              <p className="text-slate-400 text-sm">Reports submitted by users will appear here.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {reports.map(report => (
                <div key={report.id} className={`bg-white rounded-3xl border p-5 transition-all ${
                  report.status === 'pending' ? 'border-rose-200 shadow-sm' : 'border-slate-100 opacity-80'
                }`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${statusBadge(report.status)}`}>
                          {report.status}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                          {CATEGORY_LABELS[report.category] || report.category}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold">#{report.id}</span>
                      </div>
                      <p className="text-xs text-slate-500">
                        <span className="font-bold text-slate-700">{report.reporter_name || 'Unknown'}</span>
                        {' '}reported{' '}
                        <span className="font-bold text-rose-700">{report.reported_name || report.reported_id}</span>
                        {' · '}{report.reported_type === 'user' ? '👤 User' : report.reported_type}
                      </p>
                    </div>
                    <span className="text-xs text-slate-400 whitespace-nowrap">
                      {new Date(report.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>

                  {report.description && (
                    <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-3 mb-4 italic">"{report.description}"</p>
                  )}

                  <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                    {report.reported_type === 'user' && (
                      <button
                        onClick={() => openConversation(report)}
                        className="mr-auto px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-black hover:bg-slate-200 transition-colors"
                      >View conversation</button>
                    )}
                    {report.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleReportAction(String(report.id), 'reviewed')}
                          disabled={actioningReport === String(report.id)}
                          className="px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-xs font-black hover:bg-blue-100 transition-colors disabled:opacity-50"
                        >Mark Reviewed</button>
                        <button
                          onClick={() => handleReportAction(String(report.id), 'actioned')}
                          disabled={actioningReport === String(report.id)}
                          className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-black hover:bg-rose-700 shadow-lg shadow-rose-600/20 transition-colors disabled:opacity-50"
                        >Mark Actioned</button>
                      </>
                    )}
                    {report.status === 'reviewed' && (
                      <button
                        onClick={() => handleReportAction(String(report.id), 'actioned')}
                        disabled={actioningReport === String(report.id)}
                        className="px-4 py-2 bg-rose-50 text-rose-700 rounded-xl text-xs font-black hover:bg-rose-100 transition-colors disabled:opacity-50"
                      >Mark Actioned</button>
                    )}
                    {report.status === 'actioned' && (
                      <span className="text-xs text-slate-400 font-semibold italic">Resolved</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Report-scoped conversation viewer ── */}
      {convoFor && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4" onClick={() => setConvoFor(null)}>
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 flex items-start justify-between">
              <div>
                <h3 className="font-black text-lg">Conversation for report #{convoFor.id}</h3>
                <p className="text-xs text-slate-500">
                  <span className="font-bold text-slate-700">{convoFor.reporter_name || convoFor.reporter_id}</span>
                  {' ↔ '}
                  <span className="font-bold text-rose-700">{convoFor.reported_name || convoFor.reported_id}</span>
                  {' · last 50 messages · read-only except Remove'}
                </p>
              </div>
              <button onClick={() => setConvoFor(null)} className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-xs font-black hover:bg-slate-200">Close</button>
            </div>
            <div className="p-5 overflow-y-auto space-y-3">
              {convoLoading ? (
                <p className="text-slate-400 text-sm font-semibold">Loading…</p>
              ) : convoMessages.length === 0 ? (
                <p className="text-slate-400 text-sm font-semibold">These two users have no conversation.</p>
              ) : convoMessages.map(m => {
                const fromReported = m.sender_id === convoFor.reported_id;
                return (
                  <div key={m.id} className={`flex ${fromReported ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${fromReported ? 'bg-rose-50 border border-rose-100' : 'bg-slate-50 border border-slate-100'}`}>
                      <p className="text-[10px] font-bold text-slate-500 mb-1">
                        {m.sender_name || m.sender_id} · {new Date(m.created_at).toLocaleString('de-DE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {m.removed ? (
                        <p className="text-sm italic text-slate-400">Removed by moderation</p>
                      ) : (
                        <p className="text-sm text-slate-800 whitespace-pre-wrap">{m.content}</p>
                      )}
                      {!m.removed && (
                        <button
                          onClick={() => handleRemoveMessage(m.id)}
                          disabled={removingMsg === m.id}
                          className="mt-2 text-[10px] font-black uppercase tracking-widest text-rose-600 hover:text-rose-800 disabled:opacity-50"
                        >Remove</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── FLAGGED USERS TAB ── */}
      {tab === 'flagged' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Users with a risk score above 40 appear here automatically based on report volume and behaviour patterns.</p>
            <button onClick={loadFlagged} className="text-xs text-slate-400 hover:text-slate-700 font-bold">↻ Refresh</button>
          </div>

          {flaggedLoading ? (
            <div className="text-center py-16 text-slate-400 font-semibold">Loading flagged users…</div>
          ) : flagged.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center">
              <ICONS.Shield className="w-10 h-10 mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500 font-semibold">No flagged users</p>
              <p className="text-slate-400 text-sm">Users with a risk score above 40 will appear here.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {flagged.map(user => (
                <div key={user.id} className="bg-white rounded-3xl border border-orange-100 p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-500 text-lg">
                        {(user.name || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{user.name || 'Unknown'}</p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                            user.status === 'Blocked' ? 'bg-red-100 text-red-700' :
                            user.status === 'Suspended' ? 'bg-orange-100 text-orange-700' :
                            'bg-green-100 text-green-700'
                          }`}>{user.status || 'Active'}</span>
                          {user.trust_level && (
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full capitalize">
                              {user.trust_level.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className={`text-center px-4 py-2 rounded-2xl ${riskColor(user.risk_score || 0)}`}>
                      <p className="text-2xl font-black">{user.risk_score ?? '—'}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest">Risk Score</p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button onClick={() => handleUserAction(user.id, 'warn')} disabled={actioningUser === user.id}
                        className="px-3 py-2 bg-amber-50 text-amber-700 rounded-xl text-xs font-black hover:bg-amber-100 transition-colors disabled:opacity-50">
                        ⚠️ Warn
                      </button>
                      <button onClick={() => handleUserAction(user.id, 'restrict')} disabled={actioningUser === user.id || user.status === 'Suspended'}
                        className="px-3 py-2 bg-orange-50 text-orange-700 rounded-xl text-xs font-black hover:bg-orange-100 transition-colors disabled:opacity-50">
                        🔒 Suspend
                      </button>
                      <button onClick={() => handleUserAction(user.id, 'ban')} disabled={actioningUser === user.id || user.status === 'Blocked'}
                        className="px-3 py-2 bg-red-600 text-white rounded-xl text-xs font-black hover:bg-red-700 shadow-lg shadow-red-600/20 transition-colors disabled:opacity-50">
                        🚫 Ban
                      </button>
                      <button onClick={() => handleUserAction(user.id, 'clear')} disabled={actioningUser === user.id}
                        className="px-3 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-black hover:bg-green-50 hover:text-green-700 transition-colors disabled:opacity-50">
                        ✓ Clear
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                      <span className="font-semibold">Trust Score</span>
                      <span className="font-bold">{user.trust_score ?? 'N/A'}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full bg-indigo-500 transition-all" style={{ width: `${Math.min(100, user.trust_score || 0)}%` }} />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Member since {user.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── BLOCKS TAB ── */}
      {tab === 'blocks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              All active user blocks across the platform. Removing a block allows both users to contact each other again.
            </p>
            <button onClick={loadBlocks} className="text-xs text-slate-400 hover:text-slate-700 font-bold">↻ Refresh</button>
          </div>

          {blocksLoading ? (
            <div className="text-center py-16 text-slate-400 font-semibold">Loading blocks…</div>
          ) : blocks.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center">
              <svg className="w-10 h-10 mx-auto text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
              <p className="text-slate-500 font-semibold">No active blocks</p>
              <p className="text-slate-400 text-sm">User blocks will appear here when users block each other.</p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Blocked By</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Blocked User</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Date</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {blocks.map(block => (
                    <tr key={block.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-slate-900">{block.blocker_name || block.blocker_id}</p>
                        <p className="text-xs text-slate-400">{block.blocker_email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <span className="text-slate-300 text-lg">🚫</span>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{block.blocked_name || block.blocked_id}</p>
                            <p className="text-xs text-slate-400">{block.blocked_email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {new Date(block.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleRemoveBlock(String(block.id))}
                          disabled={removingBlock === String(block.id)}
                          className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-black hover:bg-green-50 hover:text-green-700 transition-colors disabled:opacity-50"
                        >
                          {removingBlock === String(block.id) ? 'Removing…' : '↩ Unblock'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TrustSafetyView;
