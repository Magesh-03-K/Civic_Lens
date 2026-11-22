'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import 'leaflet/dist/leaflet.css';
import { Priority, PRIORITY_COLORS } from '@/lib/severity';

export interface MapReportPin {
  ticketId: string;
  title: string;
  category: string;
  lat: number;
  lng: number;
  priority: Priority;
  score: number;
  status: string;
}

interface DashboardMapProps {
  reports: MapReportPin[];
}

const LeafletDashboardMap = dynamic(
  async () => {
    const [, reactLeafletMod] = await Promise.all([
      import('leaflet'),
      import('react-leaflet'),
    ]);

    const { MapContainer, TileLayer, CircleMarker, Popup } = reactLeafletMod;

    return function InnerDashboardMap({ reports }: DashboardMapProps) {
      const defaultCenter: [number, number] = [9.9252, 78.1198]; // Madurai Center

      return (
        <MapContainer
          center={defaultCenter}
          zoom={12}
          scrollWheelZoom={false}
          className="w-full h-full rounded-xl z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {reports.map((r) => {
            const color = PRIORITY_COLORS[r.priority] || '#2563eb';

            return (
              <CircleMarker
                key={r.ticketId}
                center={[r.lat, r.lng]}
                radius={8}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: 0.85,
                  weight: 2,
                }}
              >
                <Popup>
                  <div className="p-1 min-w-[180px] text-xs space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900">{r.ticketId}</span>
                      <span
                        style={{ backgroundColor: color }}
                        className="text-white text-[10px] font-bold px-1.5 py-0.5 rounded"
                      >
                        {r.priority} ({r.score})
                      </span>
                    </div>
                    <p className="font-semibold text-slate-800 line-clamp-2">{r.title}</p>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                      <span className="capitalize text-slate-500 font-medium">
                        {r.status.replace('_', ' ')}
                      </span>
                      <Link
                        href={`/ticket/${r.ticketId}`}
                        className="text-blue-600 font-bold hover:underline"
                      >
                        View &rarr;
                      </Link>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      );
    };
  },
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-slate-100 rounded-xl text-slate-400 text-sm">
        Loading public incident map...
      </div>
    ),
  }
);

export default function DashboardMap({ reports }: DashboardMapProps) {
  return (
    <div className="w-full h-80 sm:h-96 rounded-xl overflow-hidden border border-slate-200 shadow-sm relative">
      <LeafletDashboardMap reports={reports} />
    </div>
  );
}
