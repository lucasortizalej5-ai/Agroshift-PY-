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
import { translations, translateCropName } from "../i18n.js";

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
  crops = [],
  boundary,
  period,
  onClose,
  onSaved,
  lang = "en",
}) {
  const t = (k) =>
    translations[lang]?.[k] || translations.en[k] || translations.es[k] || k;

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

  function locate(isManual = false) {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      if (isManual) setError(t("gps_not_supported"));
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
        if (isManual) {
          setError(t("gps_failed"));
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  }

  useEffect(() => {
    const previous = document.activeElement;
    document.body.style.overflow = "hidden";
    first.current?.focus();

    // Auto-request location permission when modal opens
    if (!parcel) locate(false);

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
    let notice = t("parcel_saved_notice");
    try {
      saved = await request(`/api/parcels/${saved.id}/analyze`, {
        method: "POST",
        body: JSON.stringify(period),
      });
    } catch (e) {
      notice = t("parcel_saved_partial") + e.message;
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
            <p className="eyebrow">{t("form_eyebrow")}</p>
            <h2 id="plot-title">
              {parcel ? t("form_edit_title") : t("form_new_title")}
            </h2>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            disabled={busy}
            aria-label={t("close_btn")}
          >
            <X />
          </button>
        </header>
        <div className="modal-body">
          <section className="form-data">
            <h3>
              <Leaf size={17} />
              {t("crop_and_soil_section")}
            </h3>
            {error && (
              <div className="error" role="alert">
                {error}
              </div>
            )}
            <label className="field">
              {t("parcel_name_label")}
              <input
                ref={first}
                required
                maxLength={80}
                placeholder={t("parcel_name_placeholder")}
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
              />
            </label>
            <label className="field">
              {t("previous_crop_label")}
              <select
                value={form.previous_crop}
                onChange={(e) => update("previous_crop", e.target.value)}
              >
                <option value="">{t("no_previous_crop_option")}</option>
                {crops.map((c) => (
                  <option value={c.id} key={c.id}>
                    {translateCropName(c.name, lang)}
                  </option>
                ))}
              </select>
              <small>{t("previous_crop_small")}</small>
            </label>
            <div className="two-fields">
              <label className="field">
                {t("texture_label")}
                <select
                  value={form.soil_texture}
                  onChange={(e) => update("soil_texture", e.target.value)}
                >
                  <option value="desconocida">{t("texture_unknown")}</option>
                  <option value="arcillosa">{t("texture_clay")}</option>
                  <option value="franca">{t("texture_loam")}</option>
                  <option value="arenosa">{t("texture_sandy")}</option>
                </select>
              </label>
              <label className="field">
                {t("drainage_label")}
                <select
                  value={form.drainage}
                  onChange={(e) => update("drainage", e.target.value)}
                >
                  <option value="desconocido">{t("drainage_unknown")}</option>
                  <option value="bueno">{t("drainage_good")}</option>
                  <option value="intermedio">{t("drainage_moderate")}</option>
                  <option value="lento">{t("drainage_slow")}</option>
                </select>
              </label>
            </div>
            <div className="two-fields">
              <label className="field">
                {t("ph_label")}
                <input
                  type="number"
                  min={3}
                  max={10}
                  step="0.1"
                  inputMode="decimal"
                  value={form.soil_ph}
                  placeholder={t("ph_placeholder")}
                  onChange={(e) => update("soil_ph", e.target.value)}
                />
              </label>
              <label className="field">
                {t("test_date_label")}
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
              {t("ph_form_note")}
            </p>
            <label className="field">
              {t("notes_label")}
              <textarea
                maxLength={1000}
                rows={2}
                placeholder={t("notes_placeholder")}
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
              />
            </label>
          </section>
          <section className="form-location">
            <h3>
              <MapPin size={17} />
              {t("choose_location_section")}
            </h3>
            <p className="muted small">{t("location_guide")}</p>
            <Map
              latitude={form.latitude}
              longitude={form.longitude}
              radius={form.radius_m}
              boundary={boundary}
              onChange={setLocation}
              lang={lang}
            />
            <button
              type="button"
              className="button button-soft gps-button"
              onClick={() => locate(true)}
              disabled={gps || busy}
            >
              {gps ? <LoaderCircle className="spin" /> : <LocateFixed />}
              {gps ? t("finding_gps") : t("use_gps_btn")}
            </button>
            <div className="two-fields">
              <label className="field">
                {t("latitude_label")}
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
                {t("longitude_label")}
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
                else setError(t("invalid_coords_error"));
              }}
            >
              {t("locate_coords_btn")}
            </button>
            <label className="field radius-field">
              {t("radius_label")}
              <input
                type="range"
                min={50}
                max={2000}
                step={10}
                value={form.radius_m}
                onChange={(e) => update("radius_m", Number(e.target.value))}
              />
              <span className="radius-values">
                <span>
                  {number(form.radius_m, 0, lang)} {t("radius_unit")}
                </span>
                <strong>
                  {number((Math.PI * form.radius_m ** 2) / 10000, 2, lang)}{" "}
                  {t("approx_label")}
                </strong>
              </span>
              <small>{t("radius_small")}</small>
            </label>
          </section>
        </div>
        <footer className="modal-footer">
          <p>{t("modal_footer_note")}</p>
          <div>
            <button
              type="button"
              className="button button-white"
              disabled={busy}
              onClick={onClose}
            >
              {t("cancel_btn")}
            </button>
            <button className="button button-green" disabled={busy}>
              {busy ? <LoaderCircle className="spin" /> : <Check />}
              {busy ? t("saving_and_querying") : t("save_and_query_btn")}
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
}
