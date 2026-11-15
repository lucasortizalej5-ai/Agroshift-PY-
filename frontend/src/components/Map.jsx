import React, { useEffect, useRef } from "react";

export default function Map({
  latitude = -25.45,
  longitude = -54.92,
  radius = 200,
  boundary,
  onChange,
  compact = false,
  lang = "en",
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

        // Delimitación geográfica estricta de Paraguay
        const paraguayBounds = L.latLngBounds(
          L.latLng(-28.0, -63.0), // Límite Suroeste
          L.latLng(-19.0, -54.0), // Límite Noreste
        );

        const map = L.map(container.current, {
          scrollWheelZoom: false,
          zoomControl: true,
          maxZoom: 22,
          minZoom: 6,
          maxBounds: paraguayBounds,
          maxBoundsViscosity: 1.0,
          doubleClickZoom: false,
          preferCanvas: true,
          zoomAnimation: true,
          fadeAnimation: true,
          markerZoomAnimation: true,
        }).setView([latitude, longitude], compact ? 11 : 12);
        instance.current = map;

        // Capa única: Google Calles HD sin locales comerciales/POIs
        L.tileLayer(
          `https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&scale=2&hl=${lang === "en" ? "en" : "es"}&apistyle=s.t%3A2%7Cp.v%3Aoff`,
          {
            attribution: "AgroShift | &copy; Google Maps",
            subdomains: "0123",
            maxNativeZoom: 20,
            maxZoom: 22,
            bounds: paraguayBounds,
            keepBuffer: 8,
            updateWhenIdle: false,
            updateWhenZooming: false,
          },
        ).addTo(map);

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
            lang === "en"
              ? "Could not load the map. You can enter coordinates manually."
              : "No se pudo cargar el mapa. Podés ingresar las coordenadas manualmente.";
      });

    return () => {
      disposed = true;
      instance.current?.remove();
      instance.current = null;
      circle.current = null;
      marker.current = null;
    };
  }, [boundary, lang]);

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
      aria-label={
        lang === "en"
          ? "Parcel location map"
          : "Mapa de ubicación de la parcela"
      }
    >
      <span className="map-loading">
        {lang === "en"
          ? "Alto Paraná map · loading…"
          : "Mapa de Alto Paraná · cargando…"}
      </span>
    </div>
  );
}
