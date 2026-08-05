import { useEffect, useMemo, useRef, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { TruckIcon, ProfileIcon, MapPinIcon } from './icons';
import { fetchRoutePath } from '../lib/routing';
import './LiveDeliveryMap.css';

const ROUTE_REFRESH_MS = 20000;

const buildDivIcon = (Icon, className) =>
  L.divIcon({
    html: renderToStaticMarkup(
      <span className={`live-map-marker ${className}`}>
        <Icon size={16} strokeWidth={2.4} />
      </span>
    ),
    className: 'live-map-marker-wrap',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

const riderIcon = buildDivIcon(TruckIcon, 'live-map-marker-rider');
const customerIcon = buildDivIcon(ProfileIcon, 'live-map-marker-customer');
const addressIcon = buildDivIcon(MapPinIcon, 'live-map-marker-address');

function FitBounds({ points }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 15);
      return;
    }
    map.fitBounds(points, { padding: [32, 32], maxZoom: 16 });
  }, [map, points]);

  return null;
}

export default function LiveDeliveryMap({
  riderLocation,
  customerLocation,
  deliveryAddress = {},
  viewerRole,
}) {
  const hasRider = Number.isFinite(riderLocation?.lat) && Number.isFinite(riderLocation?.lng);
  const hasCustomer = Number.isFinite(customerLocation?.lat) && Number.isFinite(customerLocation?.lng);
  const hasAddress = Number.isFinite(deliveryAddress?.lat) && Number.isFinite(deliveryAddress?.lng);

  const points = useMemo(() => {
    const list = [];
    if (hasRider) list.push([riderLocation.lat, riderLocation.lng]);
    if (hasCustomer) list.push([customerLocation.lat, customerLocation.lng]);
    else if (hasAddress) list.push([deliveryAddress.lat, deliveryAddress.lng]);
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasRider, hasCustomer, hasAddress, riderLocation?.lat, riderLocation?.lng, customerLocation?.lat, customerLocation?.lng, deliveryAddress?.lat, deliveryAddress?.lng]);

  const routeEndpoints = useMemo(() => {
    if (!hasRider) return null;
    if (hasCustomer) return { from: [riderLocation.lat, riderLocation.lng], to: [customerLocation.lat, customerLocation.lng] };
    if (hasAddress) return { from: [riderLocation.lat, riderLocation.lng], to: [deliveryAddress.lat, deliveryAddress.lng] };
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasRider, hasCustomer, hasAddress, riderLocation?.lat, riderLocation?.lng, customerLocation?.lat, customerLocation?.lng, deliveryAddress?.lat, deliveryAddress?.lng]);

  const [routePath, setRoutePath] = useState(null);
  const lastRouteKeyRef = useRef('');
  const lastRouteFetchRef = useRef(0);

  useEffect(() => {
    if (!routeEndpoints) {
      setRoutePath(null);
      return undefined;
    }

    const key = `${routeEndpoints.from.join(',')}|${routeEndpoints.to.join(',')}`;
    const now = Date.now();
    if (key === lastRouteKeyRef.current && now - lastRouteFetchRef.current < ROUTE_REFRESH_MS) {
      return undefined;
    }
    lastRouteKeyRef.current = key;
    lastRouteFetchRef.current = now;

    let cancelled = false;
    fetchRoutePath(routeEndpoints.from, routeEndpoints.to).then((path) => {
      if (!cancelled) setRoutePath(path);
    });

    return () => {
      cancelled = true;
    };
  }, [routeEndpoints]);

  const boundsPoints = routePath && routePath.length > 0 ? routePath : points;

  if (points.length === 0) {
    return (
      <div className="live-map-empty">
        <MapPinIcon size={20} />
        <p>Waiting for location sharing to start…</p>
      </div>
    );
  }

  return (
    <div className="live-map-container">
      <MapContainer center={points[0]} zoom={15} scrollWheelZoom={false} className="live-map">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={boundsPoints} />
        {routePath && routePath.length > 1 ? (
          <Polyline positions={routePath} pathOptions={{ color: '#2f7a3d', weight: 4, opacity: 0.85 }} />
        ) : null}
        {hasRider ? (
          <Marker position={[riderLocation.lat, riderLocation.lng]} icon={riderIcon}>
            <Popup>{viewerRole === 'rider' ? 'You' : 'Rider'}</Popup>
          </Marker>
        ) : null}
        {hasCustomer ? (
          <Marker position={[customerLocation.lat, customerLocation.lng]} icon={customerIcon}>
            <Popup>{viewerRole === 'customer' ? 'You' : 'Customer'}</Popup>
          </Marker>
        ) : hasAddress ? (
          <Marker position={[deliveryAddress.lat, deliveryAddress.lng]} icon={addressIcon}>
            <Popup>Delivery address</Popup>
          </Marker>
        ) : null}
      </MapContainer>
    </div>
  );
}
