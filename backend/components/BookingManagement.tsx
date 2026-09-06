import React, { useState } from 'react';
import { Booking, BookingStatus } from '../types';

interface BookingManagementProps {
  bookings: Booking[];
  setBookings: React.Dispatch<React.SetStateAction<Booking[]>>;
}

const STATUS_STYLES: Record<string, string> = {
  [BookingStatus.COMPLETED]: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  [BookingStatus.PENDING]:   'bg-amber-50 text-amber-700 ring-amber-200',
  [BookingStatus.CONFIRMED]: 'bg-blue-50 text-blue-700 ring-blue-200',
  [BookingStatus.EXPIRED]:   'bg-rose-50 text-rose-700 ring-rose-200',
  [BookingStatus.CANCELLED]: 'bg-rose-50 text-rose-700 ring-rose-200',
  [BookingStatus.DECLINED]:  'bg-slate-100 text-slate-600 ring-slate-300',
};
const statusStyle = (s: BookingStatus) => STATUS_STYLES[s] || 'bg-slate-100 text-slate-600 ring-slate-200';

const formatDate = (d?: string) => {
  if (!d) return '—';
  const parsed = new Date(d);
  if (isNaN(parsed.getTime())) return d;
  return parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const initials = (name?: string) =>
  (name || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();

const Avatar: React.FC<{ name?: string; src?: string; className?: string }> = ({ name, src, className = '' }) => {
  const [broken, setBroken] = useState(false);
  if (src && !broken) {
    return <img src={src} alt={name || ''} onError={() => setBroken(true)}
      className={`object-cover rounded-full bg-slate-100 ${className}`} />;
  }
  return (
    <div className={`flex items-center justify-center rounded-full bg-slate-100 text-slate-500 font-semibold ${className}`}>
      {initials(name)}
    </div>
  );
};

const BookingManagementView: React.FC<BookingManagementProps> = ({ bookings }) => {
  const [activeFilter, setActiveFilter] = useState<BookingStatus | 'All'>('All');
  const [selected, setSelected] = useState<Booking | null>(null);

  const filters: (BookingStatus | 'All')[] = ['All', BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.COMPLETED, BookingStatus.CANCELLED, BookingStatus.DECLINED];
  const filtered = bookings.filter(b => activeFilter === 'All' || b.status === activeFilter);
  const countFor = (f: BookingStatus | 'All') => f === 'All' ? bookings.length : bookings.filter(b => b.status === f).length;

  return (
    <div className="space-y-5">
      {/* Header + filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Audit Log</h2>
          <p className="text-sm text-slate-500">{bookings.length} booking records across the marketplace</p>
        </div>
        <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
          {filters.map(f => (
            <button key={f} onClick={() => setActiveFilter(f)}
              className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeFilter === f ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}>
              {f}<span className={`ml-1.5 ${activeFilter === f ? 'text-slate-300' : 'text-slate-400'}`}>{countFor(f)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <p className="text-sm font-medium text-slate-600">No bookings to show</p>
          <p className="text-sm text-slate-400">
            {activeFilter === 'All' ? 'Bookings will appear here as they are created.' : `No ${String(activeFilter).toLowerCase()} bookings.`}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
          {filtered.map(b => (
            <div key={b.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/70 transition-colors">
              <Avatar name={b.customerName} src={b.customerAvatar} className="w-10 h-10 text-xs shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">{b.serviceName}</p>
                <p className="truncate text-sm text-slate-500">
                  {b.customerName} <span className="text-slate-300">→</span> {b.providerName}
                </p>
              </div>
              <div className="hidden sm:block text-right">
                <p className="text-sm text-slate-700">{formatDate(b.date)}</p>
                {b.time && <p className="text-xs text-slate-400">{b.time}</p>}
              </div>
              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${statusStyle(b.status)}`}>
                {b.status}
              </span>
              <button onClick={() => setSelected(b)}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors">
                Details
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Details modal — real fields only */}
      {selected && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4"
             onClick={() => setSelected(null)}>
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-200"
               onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{selected.serviceName}</h3>
                <p className="mt-0.5 text-xs text-slate-400">Booking {selected.id}</p>
              </div>
              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${statusStyle(selected.status)}`}>
                {selected.status}
              </span>
            </div>

            <div className="space-y-5 px-6 py-5">
              <div className="grid grid-cols-2 gap-4">
                <Party label="Customer" name={selected.customerName} src={selected.customerAvatar} />
                <Party label="Provider" name={selected.providerName} src={selected.providerAvatar} />
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <Field label="Scheduled date" value={formatDate(selected.date)} />
                <Field label="Scheduled time" value={selected.time || '—'} />
              </div>

              <div>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">Customer message</p>
                {selected.message ? (
                  <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-700 ring-1 ring-inset ring-slate-100">
                    {selected.message}
                  </p>
                ) : (
                  <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm italic text-slate-400 ring-1 ring-inset ring-slate-100">
                    No message provided by the customer.
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end border-t border-slate-100 px-6 py-4">
              <button onClick={() => setSelected(null)}
                className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-800 transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Field: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <p className="mb-0.5 text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
    <p className="text-slate-800">{value}</p>
  </div>
);

const Party: React.FC<{ label: string; name: string; src?: string }> = ({ label, name, src }) => (
  <div>
    <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
    <div className="flex items-center gap-2.5">
      <Avatar name={name} src={src} className="w-9 h-9 text-xs shrink-0" />
      <span className="text-sm font-medium text-slate-800">{name}</span>
    </div>
  </div>
);

export default BookingManagementView;
