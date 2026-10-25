import 'leaflet/dist/leaflet.css';
import dynamic from 'next/dynamic';

const Explorer = dynamic(() => import('@/components/Explorer'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[100dvh] w-full items-center justify-center bg-[var(--bg)]">
      <span className="text-sm text-[var(--muted)]">Shucking the map…</span>
    </div>
  ),
});

export default function Home() {
  return <Explorer />;
}
