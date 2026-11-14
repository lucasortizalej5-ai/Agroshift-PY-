import React, { useState, useRef, useEffect } from "react";
import {
  X,
  MapPin,
  LocateFixed,
  Leaf,
  Check,
  LoaderCircle,
  Info,
} from "lucide-react";
import Map from "./Map.jsx";
import { request, number } from "../api.js";

const initial = {
  name: "",
  latitude: -25.45,
  longitude: -54.92,
  radius_m: 200,
  previous_crop: "",
  soil_texture: "desconocida",
  drainage: "desconocido",
  soil_ph: "",
  soil_test_date: "",
  notes: "",
};
export default function PlotForm({
  parcel,
  crops,
  boundary,
  period,
  onClose,
  onSaved,
}) {
  const [form, setForm] = useState(() => ({
    ...initial,
    ...Object.fromEntries(
      Object.keys(initial).map((k) => [k, parcel?.[k] ?? initial[k]]),
    ),
  }));
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [gps, setGps] = useState(false);
  const [coordinate, setCoordinate] = useState({
    latitude: form.latitude,
    longitude: form.longitude,
  });
  const modal = useRef(null),
    first = useRef(null),
    active = useRef(true);
  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const setLocation = (latitude, longitude) => {
    latitude = Number(latitude.toFixed(6));
    longitude = Number(longitude.toFixed(6));
    setForm((f) => ({ ...f, latitude, longitude }));
    setCoordinate({ latitude, longitude });
  };
  useEffect(() => {
    const previous = document.activeElement;
    document.body.style.overflow = "hidden";
    first.current?.focus();
    return () => {
      active.current = false;
      document.body.style.overflow = "";
      previous?.focus?.();
    };
  }, []);
  function keydown(e) {
    if (e.key === "Escape" && !busy) onClose();
    if (e.key === "Tab") {
      const elements = [
        ...modal.current.querySelectorAll(
          "button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]",
        ),
      ].filter((e) => e.getClientRects().length);
      if (e.shiftKey && document.activeElement === elements[0]) {
        elements.at(-1)?.focus();
        e.preventDefault();
      } else if (!e.shiftKey && document.activeElement === elements.at(-1)) {
        elements[0]?.focus();
        e.preventDefault();
      }
    }
  }
  function locate() {
    if (!navigator.geolocation) {
      setError("Este dispositivo no ofrece GPS. Elegí un punto en el mapa.");
      return;
    }
    setGps(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        if (!active.current) return;
        setGps(false);
        setLocation(p.coords.latitude, p.coords.longitude);
      },
      () => {
        if (!active.current) return;
        setGps(false);
        setError(
          "No pudimos obtener tu ubicación. Revisá los permisos o elegí un punto en el mapa.",
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  }
  async function save(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const payload = {
      ...form,
      name: form.name.trim(),
      previous_crop: form.previous_crop || null,
      soil_ph: form.soil_ph === "" ? null : Number(form.soil_ph),
      soil_test_date: form.soil_test_date || null,
    };
    let saved;
    try {
      saved = await request(
        parcel ? `/api/parcels/${parcel.id}` : "/api/parcels",
        { method: parcel ? "PUT" : "POST", body: JSON.stringify(payload) },
      );
    } catch (e) {
      setError(e.message);
      setBusy(false);
      return;
    }
    let notice = "Parcela guardada y datos NASA consultados.";
    try {
      saved = await request(`/api/parcels/${saved.id}/analyze`, {
        method: "POST",
        body: JSON.stringify(period),
      });
    } catch (e) {
      notice = "La parcela quedó guardada. " + e.message;
    }
    onSaved(saved, notice);
  }
  return (
    <div className="modal-overlay" onKeyDown={keydown}>
      <form
        className="plot-modal"
        ref={modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="plot-title"
        onSubmit={save}
      >
        <header className="modal-head">
          <div>
            <p className="eyebrow">PILOTO · ALTO PARANÁ</p>
            <h2 id="plot-title">
              {parcel
                ? "Editar parcela"
                : "Una nueva parcela, un nuevo comienzo."}
            </h2>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            disabled={busy}
            aria-label="Cerrar"
          >
            <X />
          </button>
        </header>
        <div className="modal-body">
          <section className="form-data">
            <h3>
              <Leaf size={17} />
              Tu cultivo y tu suelo
            </h3>
            {error && (
              <div className="error" role="alert">
                {error}
              </div>
            )}
            <label className="field">
              Nombre de la parcela
              <input
                ref={first}
                required
                maxLength={80}
                placeholder="Ej. Lote norte"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
              />
            </label>
            <label className="field">
              Cultivo anterior
              <select
                value={form.previous_crop}
                onChange={(e) => update("previous_crop", e.target.value)}
              >
                <option value="">No lo sé / sin registro</option>
                {crops.map((c) => (
                  <option value={c.id} key={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <small>
                Este historial permite aplicar las reglas de diversificación.
              </small>
            </label>
            <div className="two-fields">
              <label className="field">
                Textura observada
                <select
                  value={form.soil_texture}
                  onChange={(e) => update("soil_texture", e.target.value)}
                >
                  <option value="desconocida">No lo sé</option>
                  <option value="arcillosa">Arcillosa</option>
                  <option value="franca">Franca</option>
                  <option value="arenosa">Arenosa</option>
                </select>
              </label>
              <label className="field">
                Drenaje observado
                <select
                  value={form.drainage}
                  onChange={(e) => update("drainage", e.target.value)}
                >
                  <option value="desconocido">No lo sé</option>
                  <option value="bueno">Bueno</option>
                  <option value="intermedio">Intermedio</option>
                  <option value="lento">Lento / se encharca</option>
                </select>
              </label>
            </div>
            <div className="two-fields">
              <label className="field">
                pH medido (opcional)
                <input
                  type="number"
                  min={3}
                  max={10}
                  step="0.1"
                  inputMode="decimal"
                  value={form.soil_ph}
                  placeholder="Sin análisis"
                  onChange={(e) => update("soil_ph", e.target.value)}
                />
              </label>
              <label className="field">
                Fecha del análisis
                <input
                  type="date"
                  required={form.soil_ph !== ""}
                  max={new Date().toISOString().slice(0, 10)}
                  value={form.soil_test_date}
                  onChange={(e) => update("soil_test_date", e.target.value)}
                />
              </label>
            </div>
            <p className="form-note">
              <Info size={14} />
              El pH no determina los nutrientes. No calculamos dosis de
              fertilizante.
            </p>
            <label className="field">
              Observaciones (opcional)
              <textarea
                maxLength={1000}
                rows={2}
                placeholder="Lo que conocés de tu terreno…"
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
              />
            </label>
          </section>
          <section className="form-location">
            <h3>
              <MapPin size={17} />
              Elegí el lugar que querés cultivar
            </h3>
            <p className="muted small">
              Tocá el mapa, mové el punto o utilizá el GPS. El piloto admite
              parcelas dentro de Alto Paraná.
            </p>
            <Map
              latitude={form.latitude}
              longitude={form.longitude}
              radius={form.radius_m}
              boundary={boundary}
              onChange={setLocation}
            />
            <button
              type="button"
              className="button button-soft gps-button"
              onClick={locate}
              disabled={gps || busy}
            >
              {gps ? <LoaderCircle className="spin" /> : <LocateFixed />}
              {gps ? "Buscando ubicación…" : "Usar mi ubicación"}
            </button>
            <div className="two-fields">
              <label className="field">
                Latitud
                <input
                  type="number"
                  step="any"
                  min={-90}
                  max={90}
                  value={coordinate.latitude}
                  onChange={(e) =>
                    setCoordinate((c) => ({ ...c, latitude: e.target.value }))
                  }
                />
              </label>
              <label className="field">
                Longitud
                <input
                  type="number"
                  step="any"
                  min={-180}
                  max={180}
                  value={coordinate.longitude}
                  onChange={(e) =>
                    setCoordinate((c) => ({ ...c, longitude: e.target.value }))
                  }
                />
              </label>
            </div>
            <button
              type="button"
              className="inline-link"
              onClick={() => {
                const lat = Number(coordinate.latitude),
                  lon = Number(coordinate.longitude);
                if (
                  Number.isFinite(lat) &&
                  Number.isFinite(lon) &&
                  Math.abs(lat) <= 90 &&
                  Math.abs(lon) <= 180
                )
                  setLocation(lat, lon);
                else setError("Revisá las coordenadas.");
              }}
            >
              Ubicar estas coordenadas →
            </button>
            <label className="field radius-field">
              Radio de aprovechamiento
              <input
                type="range"
                min={50}
                max={2000}
                step={10}
                value={form.radius_m}
                onChange={(e) => update("radius_m", Number(e.target.value))}
              />
              <span className="radius-values">
                <span>{number(form.radius_m, 0)} m de radio</span>
                <strong>
                  {number((Math.PI * form.radius_m ** 2) / 10000, 2)} ha aprox.
                </strong>
              </span>
              <small>
                Área circular de referencia, no catastral. NASA consulta el
                punto central; el radio no aumenta su resolución.
              </small>
            </label>
          </section>
        </div>
        <footer className="modal-footer">
          <p>
            Las parcelas se guardan en SQLite. NASA recibe las coordenadas
            consultadas; OpenStreetMap recibe las solicitudes del mapa.
          </p>
          <div>
            <button
              type="button"
              className="button button-white"
              disabled={busy}
              onClick={onClose}
            >
              Cancelar
            </button>
            <button className="button button-green" disabled={busy}>
              {busy ? <LoaderCircle className="spin" /> : <Check />}
              {busy ? "Guardando y consultando…" : "Guardar y consultar NASA"}
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
}
