'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import OysterMap from '@/components/OysterMap';
import {
  BARS,
  CITIES,
  directionsUrl,
  easternNow,
  formatVerified,
  happyHourStatus,
  pricePerOyster,
  statusLabel,
  type CityId,
  type OysterBar,
} from '@/lib/bars';

type Filter = 'now' | 'cheap' | 'verified';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'now', label: 'On now' },
  { id: 'cheap', label: '$1.50 & under' },
  { id: 'verified', label: 'Recently checked' },
];

// Re-render every minute so "on now" badges stay accurate.
function useMinuteTick() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);
  return tick;
}

export default function Explorer() {
  const [city, setCity] = useState<CityId>('nyc');
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Set<Filter>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const tick = useMinuteTick();
  const listRef = useRef<HTMLDivElement>(null);

  const cityBars = useMemo(() => BARS.filter((b) => b.city === city), [city]);

  const { visible, liveCount } = useMemo(() => {
    const now = easternNow();
    const q = query.trim().toLowerCase();
    const rank = { now: 0, soon: 1, later: 2, unknown: 3 } as const;
    const rows = cityBars
      .map((bar) => ({ bar, status: happyHourStatus(bar, now), price: pricePerOyster(bar) }))
      .filter(({ bar, status, price }) => {
        if (q && !`${bar.name} ${bar.neighborhood} ${bar.oyster} ${bar.deal}`.toLowerCase().includes(q)) return false;
        if (filters.has('now') && status.kind !== 'now') return false;
        if (filters.has('cheap') && (price === null || price > 1.5)) return false;
        if (filters.has('verified') && !bar.verified) return false;
        return true;
      })
      .sort((a, b) => rank[a.status.kind] - rank[b.status.kind] || (a.price ?? 99) - (b.price ?? 99));
    return {
      visible: rows,
      liveCount: cityBars.filter((b) => happyHourStatus(b, now).kind === 'now').length,
    };
    // tick is a dependency so the list re-sorts as happy hours start and end.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityBars, query, filters, tick]);

  const visibleBars = useMemo(() => visible.map((r) => r.bar), [visible]);

  const select = (id: string) => {
    setSelectedId(id);
    setSheetOpen(true);
  };

  useEffect(() => {
    if (!selectedId) return;
    listRef.current?.querySelector(`[data-id="${selectedId}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [selectedId]);

  const toggleFilter = (f: Filter) =>
    setFilters((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      return next;
    });

  const changeCity = (id: CityId) => {
    setCity(id);
    setSelectedId(null);
  };

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden bg-[var(--bg)]">
      <div className="absolute inset-0">
        <OysterMap
          bars={visibleBars}
          selectedId={selectedId}
          center={CITIES[city].center}
          zoom={CITIES[city].zoom}
          onSelect={select}
        />
      </div>

      <aside
        className={`panel absolute inset-x-0 bottom-0 z-[1000] flex flex-col rounded-t-[28px] transition-[height] duration-300 ease-out
          md:inset-y-4 md:left-4 md:right-auto md:h-auto md:w-[400px] md:rounded-[28px]
          ${sheetOpen ? 'h-[72dvh]' : 'h-[230px]'}`}
      >
        <button
          className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-[var(--line-strong)] md:hidden"
          onClick={() => setSheetOpen((o) => !o)}
          aria-label={sheetOpen ? 'Collapse list' : 'Expand list'}
        />

        <header className="shrink-0 px-5 pb-3 pt-3 md:pt-6">
          <div className="flex items-center gap-3">
            <ShellLogo />
            <div className="min-w-0">
              <h1 className="font-display text-[22px] font-semibold leading-tight tracking-tight">OysterMap</h1>
              <p className="text-[13px] text-[var(--muted)]">
                {cityBars.length} happy hours · <span className="text-[var(--live)]">{liveCount} on now</span>
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 rounded-2xl bg-[var(--chip)] p-1" role="tablist">
            {(Object.keys(CITIES) as CityId[]).map((id) => (
              <button
                key={id}
                role="tab"
                aria-selected={city === id}
                onClick={() => changeCity(id)}
                className={`rounded-xl py-2 text-[13px] font-medium transition ${
                  city === id ? 'bg-[var(--surface)] text-[var(--fg)] shadow-sm' : 'text-[var(--muted)] hover:text-[var(--fg)]'
                }`}
              >
                {CITIES[id].short}
              </button>
            ))}
          </div>

          <div className={`${sheetOpen ? 'block' : 'hidden'} md:block`}>
            <label className="mt-3 flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-3.5 py-2.5 focus-within:border-[var(--accent)]">
              <SearchIcon />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search bars, neighborhoods, deals"
                className="w-full bg-transparent text-[14px] outline-none placeholder:text-[var(--muted)]"
              />
            </label>

            <div className="mt-3 flex flex-wrap gap-2">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => toggleFilter(f.id)}
                  aria-pressed={filters.has(f.id)}
                  className={`rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition ${
                    filters.has(f.id)
                      ? 'border-transparent bg-[var(--accent)] text-[var(--on-accent)]'
                      : 'border-[var(--line)] text-[var(--muted)] hover:border-[var(--line-strong)] hover:text-[var(--fg)]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
          {visible.length === 0 ? (
            <p className="px-3 py-10 text-center text-sm text-[var(--muted)]">No spots match. Try clearing a filter.</p>
          ) : (
            <ul className="space-y-2">
              {visible.map(({ bar }) => (
                <li key={bar.id} data-id={bar.id}>
                  <BarCard bar={bar} selected={bar.id === selectedId} onSelect={() => select(bar.id)} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="hidden shrink-0 border-t border-[var(--line)] px-5 py-3 text-[11.5px] leading-snug text-[var(--muted)] md:block">
          Deals refreshed Oct 2026. Hours change — confirm before you go.
        </footer>
      </aside>
    </main>
  );
}

function BarCard({ bar, selected, onSelect }: { bar: OysterBar; selected: boolean; onSelect: () => void }) {
  const status = happyHourStatus(bar);
  const label = statusLabel(status);
  const verified = formatVerified(bar.verified);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect()}
      className={`card w-full cursor-pointer rounded-2xl p-4 text-left transition ${selected ? 'card--selected' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-semibold">{bar.name}</h3>
          <p className="text-[12.5px] text-[var(--muted)]">{bar.neighborhood}</p>
        </div>
        {label && (
          <span className={`badge shrink-0 ${status.kind === 'now' ? 'badge--live' : 'badge--soon'}`}>
            {status.kind === 'now' && <span className="live-dot" />}
            {label}
          </span>
        )}
      </div>

      {bar.oyster && <p className="mt-2.5 font-display text-[17px] font-semibold leading-snug text-[var(--accent)]">{bar.oyster}</p>}
      <p className="mt-1 text-[13px] text-[var(--fg-soft)]">{bar.when}</p>

      {selected && (
        <div className="mt-3 space-y-3 border-t border-[var(--line)] pt-3">
          {bar.deal && <p className="text-[13px] leading-relaxed text-[var(--fg-soft)]">{bar.deal}</p>}
          <p className="text-[12.5px] text-[var(--muted)]">{bar.address}</p>
          <div className="flex items-center justify-between gap-3">
            <a
              href={directionsUrl(bar)}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="rounded-full bg-[var(--accent)] px-4 py-2 text-[13px] font-semibold text-[var(--on-accent)] transition hover:opacity-90"
            >
              Directions
            </a>
            <span className="text-[11.5px] text-[var(--muted)]">{verified ?? 'Not recently confirmed — call ahead'}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function ShellLogo() {
  return (
    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--accent)] text-[var(--on-accent)] shadow-md">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
        <path d="M12 20c-4.5 0-8-3-8-7.5C4 8 7.5 4 12 4s8 4 8 8.5c0 4.5-3.5 7.5-8 7.5Z" />
        <path d="M12 20V9M12 20l-4.5-9M12 20l4.5-9M12 20 6 14M12 20l6-6" />
      </svg>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-[var(--muted)]" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" strokeLinecap="round" />
    </svg>
  );
}
