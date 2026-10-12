import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Room } from '../../types';
import { MapPin, Navigation, Phone, Eye } from 'lucide-react';

interface RoomMapProps {
  rooms: Room[];
  selectedCity?: string;
  onSelectRoom: (room: Room) => void;
  className?: string;
  height?: string;
}

// Geographical coordinates for Nepal cities and localities
const CITY_COORDINATES: Record<string, [number, number]> = {
  'Kathmandu': [27.7172, 85.3240],
  'Lalitpur': [27.6710, 85.3200],
  'Pokhara': [28.2096, 83.9856],
  'Dhangadhi': [28.6852, 80.5975],
  'Bhaktapur': [27.6710, 85.4298],
  'All Cities': [28.0000, 84.5000] // Center of Nepal
};

const LOCALITY_OFFSETS: Record<string, [number, number]> = {
  'Baluwatar': [27.7290, 85.3310],
  'Kapan': [27.7380, 85.3620],
  'Shankhamul': [27.6830, 85.3330],
  'Jhamsikhel': [27.6740, 85.3120],
  'Bakhundole': [27.6810, 85.3160],
  'Lakeside': [28.2130, 83.9570],
  'Campus Road': [28.6910, 80.6020],
  'Suryabinayak': [27.6650, 85.4210],
};

function getRoomCoordinates(room: Room, index: number): [number, number] {
  // Check locality offset first
  if (room.area && LOCALITY_OFFSETS[room.area]) {
    return LOCALITY_OFFSETS[room.area];
  }
  for (const [key, coords] of Object.entries(LOCALITY_OFFSETS)) {
    if (room.location.toLowerCase().includes(key.toLowerCase())) {
      return coords;
    }
  }

  // Fallback to city coordinates with subtle random jitter so multiple rooms in same city don't completely overlap
  const base = CITY_COORDINATES[room.city] || CITY_COORDINATES['Kathmandu'];
  const jitterLat = (Math.sin(index * 7.5 + 1) * 0.008);
  const jitterLng = (Math.cos(index * 9.2 + 2) * 0.008);
  return [base[0] + jitterLat, base[1] + jitterLng];
}

export const RoomMap: React.FC<RoomMapProps> = ({
  rooms,
  selectedCity = 'All Cities',
  onSelectRoom,
  className = '',
  height = '480px'
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const initialCenter: [number, number] = CITY_COORDINATES[selectedCity] || [27.7172, 85.3240];
      const initialZoom = selectedCity === 'All Cities' ? 7 : 13;

      const map = L.map(mapContainerRef.current, {
        center: initialCenter,
        zoom: initialZoom,
        scrollWheelZoom: false, // Prevent accidental scrolling when page scrolls
      });

      // CartoDB Positron / OSM tiles for a warm, clean aesthetic matching #F5E9E7
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 19,
      }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update center when city changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const target = CITY_COORDINATES[selectedCity];
    if (target) {
      const zoom = selectedCity === 'All Cities' ? 7 : 13;
      mapInstanceRef.current.setView(target, zoom, { animate: true });
    }
  }, [selectedCity]);

  // Update room markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    const bounds: [number, number][] = [];

    rooms.forEach((room, idx) => {
      const [lat, lng] = getRoomCoordinates(room, idx);
      bounds.push([lat, lng]);

      const formattedRentK = room.rent >= 1000 
        ? `${Math.round(room.rent / 1000)}k` 
        : `${room.rent}`;

      // Custom HTML Marker matching #ECC5C6 and #4A282A theme
      const customIcon = L.divIcon({
        className: 'custom-room-marker',
        html: `
          <div style="
            background-color: #4A282A;
            color: #FFFFFF;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 800;
            border: 2px solid #ECC5C6;
            box-shadow: 0 4px 10px rgba(0,0,0,0.25);
            display: flex;
            align-items: center;
            gap: 4px;
            white-space: nowrap;
            cursor: pointer;
            transform: translate(-50%, -50%);
          ">
            <span style="color: #ECC5C6;">NPR</span> ${formattedRentK}
          </div>
        `,
        iconSize: [60, 24],
        iconAnchor: [30, 12]
      });

      const marker = L.marker([lat, lng], { icon: customIcon });

      // Interactive Popup with direct contact info
      const popupContent = document.createElement('div');
      popupContent.style.width = '240px';
      popupContent.style.fontFamily = 'Plus Jakarta Sans, sans-serif';
      popupContent.innerHTML = `
        <div style="border-radius: 14px; overflow: hidden;">
          <img src="${room.coverImageUrl || room.imageUrls[0]}" style="width: 100%; height: 110px; object-fit: cover; border-radius: 10px;" />
          <div style="padding-top: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: baseline;">
              <span style="font-size: 10px; font-weight: 800; color: #4A282A; background: #ECC5C6; padding: 2px 6px; border-radius: 6px;">${room.roomType}</span>
              <span style="font-size: 12px; font-weight: 800; color: #4A282A;">NPR ${new Intl.NumberFormat('en-NP').format(room.rent)}/mo</span>
            </div>
            <h4 style="font-size: 12px; font-weight: bold; margin: 6px 0 2px 0; color: #1F2937; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${room.title}</h4>
            <p style="font-size: 11px; color: #6B7280; margin: 0 0 6px 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">📍 ${room.location}</p>
            
            <div style="background: #F5E9E7; padding: 6px 8px; border-radius: 8px; margin-bottom: 8px; border: 1px solid #ECC5C6; font-size: 10px;">
              <div style="color: #7A595B; font-weight: bold;">Owner: ${room.ownerName}</div>
              <div style="color: #382022; font-weight: bold;">📞 ${room.contactNumber}</div>
            </div>

            <button id="view-room-btn-${room.id}" style="width: 100%; background: #4A282A; color: white; border: none; padding: 6px 10px; border-radius: 8px; font-size: 11px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;">
              View Full Details
            </button>
          </div>
        </div>
      `;

      // Bind button click
      marker.bindPopup(popupContent, { maxWidth: 260 });
      marker.on('popupopen', () => {
        const btn = document.getElementById(`view-room-btn-${room.id}`);
        if (btn) {
          btn.onclick = () => {
            onSelectRoom(room);
          };
        }
      });

      markersLayer.addLayer(marker);
    });

    // Fit bounds if multiple rooms
    if (bounds.length > 1 && selectedCity === 'All Cities') {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [rooms, onSelectRoom, selectedCity]);

  return (
    <div className={`relative rounded-3xl overflow-hidden border border-[#ECC5C6] shadow-sm bg-[#FFFFFF] ${className}`}>
      {/* Map Control Overlay Banner */}
      <div className="absolute top-3 left-3 z-[1000] bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#ECC5C6] shadow-xs flex items-center gap-2 text-xs font-bold text-[#4A282A]">
        <MapPin className="w-3.5 h-3.5 text-[#8A4A4D]" />
        <span>{rooms.length} Available Rooms in Nepal</span>
      </div>

      <div className="absolute top-3 right-3 z-[1000] bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-xl border border-[#ECC5C6] shadow-xs text-[10px] text-[#7A595B] font-medium hidden sm:block">
        Tap markers to see rent &amp; landlord contact
      </div>

      {/* Map Element */}
      <div 
        ref={mapContainerRef} 
        style={{ height, width: '100%' }}
        className="z-0"
      />
    </div>
  );
};
