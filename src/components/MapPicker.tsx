'use client';

import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';

interface MapPickerProps {
  position: [number, number];
  onPositionChange: (pos: [number, number]) => void;
}

// Leaflet inner map loaded dynamically with SSR disabled
const LeafletInnerMap = dynamic(
  async () => {
    const [leafletMod, reactLeafletMod] = await Promise.all([
      import('leaflet'),
      import('react-leaflet'),
    ]);

    const L = leafletMod.default || leafletMod;
    const { MapContainer, TileLayer, Marker, useMap, useMapEvents } = reactLeafletMod;

    const customPin = L.divIcon({
      className: 'custom-map-pin',
      html: `
        <div style="background-color: #2563eb; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"></path>
          </svg>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    });

    function MapRecenter({ position }: { position: [number, number] }) {
      const map = useMap();
      const [lastLat, lastLng] = position;

      useMapEvents({
        click(e) {
          map.panTo(e.latlng);
        },
      });

      // Pan to new coordinates when position changes externally
      map.panTo([lastLat, lastLng]);

      return null;
    }

    function DraggableMarker({
      position,
      onPositionChange,
    }: {
      position: [number, number];
      onPositionChange: (pos: [number, number]) => void;
    }) {
      useMapEvents({
        click(e) {
          onPositionChange([e.latlng.lat, e.latlng.lng]);
        },
      });

      return (
        <Marker
          position={position}
          icon={customPin}
          draggable={true}
          eventHandlers={{
            dragend(e) {
              const marker = e.target;
              const pos = marker.getLatLng();
              onPositionChange([pos.lat, pos.lng]);
            },
          }}
        />
      );
    }

    return function InnerMap({ position, onPositionChange }: MapPickerProps) {
      return (
        <MapContainer
          center={position}
          zoom={14}
          scrollWheelZoom={false}
          className="w-full h-full rounded-lg z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapRecenter position={position} />
          <DraggableMarker position={position} onPositionChange={onPositionChange} />
        </MapContainer>
      );
    };
  },
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-slate-100 rounded-lg text-slate-500 text-sm">
        Loading interactive map...
      </div>
    ),
  }
);

export default function MapPicker({ position, onPositionChange }: MapPickerProps) {
  return (
    <div className="w-full h-64 sm:h-72 relative rounded-lg border border-slate-200 overflow-hidden shadow-inner">
      <LeafletInnerMap position={position} onPositionChange={onPositionChange} />
    </div>
  );
}
