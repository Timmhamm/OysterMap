import data from '@/data/oyster-bars.json';

export type CityId = 'nyc' | 'philadelphia' | 'pittsburgh';

export interface ScheduleWindow {
  days: number[]; // 0 = Sunday … 6 = Saturday
  start: string; // "HH:MM", local Eastern time
  end: string;
}

export interface OysterBar {
  id: string;
  name: string;
  city: CityId;
  address: string;
  neighborhood: string;
  oyster: string;
  deal: string;
  when: string;
  schedule: ScheduleWindow[];
  verified: string | null; // "YYYY-MM" or "YYYY" of the newest source that confirmed the deal
  coordinates: [number, number];
}

export const BARS = data as OysterBar[];

export const CITIES: Record<CityId, { name: string; short: string; center: [number, number]; zoom: number }> = {
  nyc: { name: 'New York', short: 'NYC', center: [40.722, -73.975], zoom: 12 },
  philadelphia: { name: 'Philadelphia', short: 'Philly', center: [39.95, -75.16], zoom: 14 },
  pittsburgh: { name: 'Pittsburgh', short: 'Pittsburgh', center: [40.447, -79.99], zoom: 13 },
};

export type HappyHourStatus = { kind: 'now'; endsIn: number } | { kind: 'soon'; startsIn: number } | { kind: 'later' } | { kind: 'unknown' };

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** Current weekday and minute-of-day in US Eastern time, where every bar lives. */
export function easternNow(date = new Date()): { day: number; minute: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  return { day, minute: Number(get('hour')) * 60 + Number(get('minute')) };
}

const SOON_WINDOW = 90;

export function happyHourStatus(bar: OysterBar, now = easternNow()): HappyHourStatus {
  if (bar.schedule.length === 0) return { kind: 'unknown' };
  let soonest: number | null = null;
  for (const w of bar.schedule) {
    if (!w.days.includes(now.day)) continue;
    const start = toMinutes(w.start);
    const end = toMinutes(w.end);
    if (now.minute >= start && now.minute < end) return { kind: 'now', endsIn: end - now.minute };
    if (start > now.minute && (soonest === null || start - now.minute < soonest)) soonest = start - now.minute;
  }
  if (soonest !== null && soonest <= SOON_WINDOW) return { kind: 'soon', startsIn: soonest };
  return { kind: 'later' };
}

export function formatDuration(minutes: number): string {
  if (minutes >= 6 * 60) return 'all night';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h === 0 ? `${m}m` : m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function statusLabel(status: HappyHourStatus): string | null {
  switch (status.kind) {
    case 'now':
      return status.endsIn >= 6 * 60 ? 'On now' : `On now · ${formatDuration(status.endsIn)} left`;
    case 'soon':
      return `Starts in ${formatDuration(status.startsIn)}`;
    default:
      return null;
  }
}

/** Best-effort per-oyster price from the free-text deal, for sorting and the "$1–$1.50" filter. */
export function pricePerOyster(bar: OysterBar): number | null {
  const text = bar.oyster.toLowerCase();
  const bulk = text.match(/\$(\d+(?:\.\d+)?)\s*(?:\/\s*)?(half[- ]?dozen|for six|for 6|dozen)/);
  if (bulk) return Number(bulk[1]) / (bulk[2] === 'dozen' ? 12 : 6);
  const ea = text.match(/~?\$(\d+(?:\.\d+)?)/);
  if (ea && Number(ea[1]) <= 5) return Number(ea[1]);
  return null;
}

export function formatVerified(verified: string | null): string | null {
  if (!verified) return null;
  const [year, month] = verified.split('-').map(Number);
  if (!month) return `Checked ${year}`;
  return `Checked ${new Date(year, month - 1).toLocaleString('en-US', { month: 'short' })} ${year}`;
}

export function directionsUrl(bar: OysterBar): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${bar.name}, ${bar.address}`)}`;
}
