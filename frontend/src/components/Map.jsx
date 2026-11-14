import React, { useEffect, useRef } from "react";

export default function Map({
  latitude = -25.45,
  longitude = -54.92,
  radius = 200,
  boundary,
  onChange,
  compact = false,
}) {
  const container = useRef(null),
    instance = useRef(null),
    circle = useRef(null),
    marker = useRef(null),
    callback = useRef(onChange);
  callback.current = onChange;
  useEffect(() => {
    let disposed = false;
    import("leaflet")
      .then((module) => {
        if (disposed || !container.current) return;
        const L = module.default;
        const map = L.map(container.current, {
          scrollWheelZoom: false,
          zoomControl: true,
        }).setView([latitude, longitude], compact ? 11 : 12);
        instance.current = map;
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 18,
          attribution:
            '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
        }).addTo(map);
        if (boundary)
          L.geoJSON(boundary, {
            style: {
              color: "#7c9e59",
              weight: 2,
              fillOpacity: 0.04,
              interactive: false,
            },
          }).addTo(map);
        circle.current = L.circle([latitude, longitude], {
          radius,
          color: "#436d39",
          fillColor: "#8daf5d",
          fillOpacity: 0.24,
          weight: 2,
        }).addTo(map);
        marker.current = L.marker([latitude, longitude], {
          draggable: !!onChange,
          icon: L.divIcon({
            className: "agro-marker",
            html: "<span></span>",
            iconSize: [18, 18],
            iconAnchor: [9, 9],
          }),
        }).addTo(map);
        if (onChange) {
          map.on("click", (e) =>
            callback.current?.(e.latlng.lat, e.latlng.lng),
          );
          marker.current.on("dragend", () => {
            const p = marker.current.getLatLng();
            callback.current?.(p.lat, p.lng);
          });
        }
        setTimeout(() => map.invalidateSize(), 60);
      })
      .catch(() => {
        if (container.current)
          container.current.textContent =
            "No se pudo cargar el mapa. Podés ingresar las coordenadas manualmente.";
      });
    return () => {
      disposed = true;
      instance.current?.remove();
      instance.current = null;
      circle.current = null;
      marker.current = null;
    };
  }, [boundary]);
  useEffect(() => {
    const position = [latitude, longitude];
    circle.current?.setLatLng(position).setRadius(radius);
    marker.current?.setLatLng(position);
    if (instance.current && !instance.current.getBounds().contains(position))
      instance.current.panTo(position);
  }, [latitude, longitude, radius]);
  return (
    <div
      ref={container}
      className={`map ${compact ? "map-compact" : ""}`}
      role="region"
      aria-label="Mapa de ubicación de la parcela"
    >
      <span className="map-loading">Mapa de Alto Paraná · cargando…</span>
    </div>
  );
}
