'use client';

import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';

interface TicketMiniMapProps {
  lat: number;
  lng: number;
}

const LeafletTicketMap = dynamic(
  async () => {
    const [leafletMod, reactLeafletMod] = await Promise.all([
      import('leaflet'),
      import('react-leaflet'),
    ]);

    const L = leafletMod.default || leafletMod;
    const { MapContainer, TileLayer, Marker } = reactLeafletMod;

    const ticketPin = L.divIcon({
      className: 'custom-ticket-pin',
      html: `
        <div style="background-color: #dc2626; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 3px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });

    return function TicketMapComponent({ lat, lng }: TicketMiniMapProps) {
      return (
        <MapContainer
          center={[lat, lng]}
          zoom={15}
          scrollWheelZoom={false}
          className="w-full h-full rounded-lg z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={[lat, lng]} icon={ticketPin} />
        </MapContainer>
      );
    };
  },
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-slate-100 rounded-lg text-slate-400 text-xs">
        Loading map coordinates...
      </div>
    ),
  }
);

export default function TicketMiniMap({ lat, lng }: TicketMiniMapProps) {
  return (
    <div className="w-full h-48 rounded-lg overflow-hidden border border-slate-200">
      <LeafletTicketMap lat={lat} lng={lng} />
    </div>
  );
}
