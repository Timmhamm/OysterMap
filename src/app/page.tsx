import 'leaflet/dist/leaflet.css';
import dynamic from 'next/dynamic';

const OysterMap = dynamic(() => import('@/components/OysterMap'), {
  ssr: false,
  loading: () => (
    <div className="h-screen w-full bg-slate-200 flex items-center justify-center">
      <span className="text-slate-600">Loading map…</span>
    </div>
  ),
});

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-200">
      <div className="absolute top-[10px] left-20 z-[1000] rounded-lg bg-white/95 px-4 py-2 shadow-md">
        <h1 className="text-lg font-semibold text-slate-800">NYC Oyster Happy Hours</h1>
        <p className="text-sm text-slate-600">Click a marker for details</p>
      </div>
      <OysterMap />
    </main>
  );
}
