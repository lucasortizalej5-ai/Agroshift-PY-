import React, { useState, useEffect, useRef } from "react";
import {
  Home,
  Map,
  Leaf,
  Repeat2,
  Sun,
  Moon,
  LogOut,
  BookOpen,
  Plus,
  ArrowRight,
  Satellite,
  Globe2,
  MapPin,
  Thermometer,
  CloudRain,
  Wind,
  Layers,
  Info,
  ShieldCheck,
  ChevronRight,
  Menu,
  X,
  Download,
  RefreshCw,
  Trash2,
  Pencil,
  AlertTriangle,
  LoaderCircle,
  Check,
  Sprout,
} from "lucide-react";
import PlotForm from "./components/PlotForm.jsx";
import PlotMap from "./components/Map.jsx";
import Environment, {
  ClimateChart,
  SourceMeta,
} from "./components/Environment.jsx";
import Rotation from "./components/Rotation.jsx";
import { request, number, dayLabel } from "./api.js";
import {
  translations,
  translateCropName,
  translateTexture,
  translateDrainage,
  SOURCES_ARTICLES,
} from "./i18n.js";

const NAV_DEFS = [
  ["dashboard", "nav_dashboard", Home],
  ["parcels", "nav_parcels", Map],
  ["rotation", "nav_rotation", Repeat2],
  ["climate", "nav_climate", Sun],
  ["soil", "nav_soil", Layers],
  ["sources", "nav_sources", BookOpen],
];

function Metric({ label, value, unit, icon: Icon, detail }) {
  return (
    <article className="metric-card">
      <div>
        <p>{label}</p>
        <span className="metric-icon">
          <Icon size={18} />
        </span>
      </div>
      <h3>
        {value}
        <small>{unit}</small>
      </h3>
      <span className="metric-detail">{detail}</span>
    </article>
  );
}

function Empty({
  onNew,
  title,
  text,
  cta,
  lang = "en",
  t = (k) => translations.en[k] || translations.es[k] || k,
}) {
  return (
    <div className="empty-state">
      <Sprout />
      <h2>{title || t("empty_plots_title")}</h2>
      <p>{text || t("empty_plots_desc")}</p>
      <button className="button button-green" onClick={() => onNew()}>
        {cta || t("empty_plots_cta")}
        <ArrowRight />
      </button>
    </div>
  );
}

function Dashboard({
  parcels,
  parcel,
  region,
  onNew,
  onEdit,
  onNavigate,
  onAnalyze,
  busy,
  lang = "en",
  t = (k) => translations.en[k] || translations.es[k] || k,
}) {
  const c = parcel?.climate,
    s = c?.summary,
    r = parcel?.recommendation;

  const complete = (p) =>
    s?.[p]
      ? `${s[p].valid_days}/${s[p].expected_days} ${t("valid_days")}`
      : t("no_nasa_yet");

  return (
    <>
      <section className="hero-card">
        <div className="hero-copy">
          <span className="hero-badge">
            <Satellite size={13} />
            {t("nasa_badge")}
          </span>
          <h1>
            {t("hero_title_1")}
            <br />
            <span>{t("hero_title_2")}</span>
          </h1>
          <p>{t("hero_desc")}</p>
          <div className="hero-actions">
            <button className="button button-yellow" onClick={() => onNew()}>
              <Leaf />
              {t("plan_rotation")}
              <ArrowRight />
            </button>
            <button
              className="hero-secondary"
              onClick={() => onNavigate("sources")}
            >
              {t("learn_project")}
            </button>
          </div>
        </div>
        <div
          className="hero-image"
          role="img"
          aria-label={t("hero_image_aria")}
        >
          <div className="orbit">
            <span>NASA POWER</span>
          </div>
          <div className="hero-caption">
            <Globe2 size={26} />
            <p>
              {t("orbit_caption_1")}
              <br />
              {t("orbit_caption_2")}
            </p>
          </div>
        </div>
      </section>

      <div className="section-heading">
        <div>
          <h2>{t("look_at_field")}</h2>
          <p>
            {parcels.length}{" "}
            {parcels.length === 1
              ? t("registered_plots_single")
              : t("registered_plots_plural")}{" "}
            · {parcel?.name || t("start_by_knowing")}
          </p>
        </div>
        <span className="location-badge">
          <MapPin size={13} />
          {t("location_badge")}
        </span>
      </div>

      <div className="metric-grid">
        <Metric
          label={t("metric_temp")}
          value={number(s?.T2M?.value, 1, lang)}
          unit="°C"
          icon={Thermometer}
          detail={complete("T2M")}
        />
        <Metric
          label={t("metric_rain")}
          value={number(s?.PRECTOTCORR?.value, 1, lang)}
          unit="mm"
          icon={CloudRain}
          detail={complete("PRECTOTCORR")}
        />
        <Metric
          label={t("metric_humidity")}
          value={number(s?.RH2M?.value, 0, lang)}
          unit="%"
          icon={Wind}
          detail={complete("RH2M")}
        />
        <Metric
          label={t("metric_area")}
          value={number(parcel?.area_ha, 2, lang)}
          unit="ha"
          icon={Layers}
          detail={
            parcel
              ? `${number(parcel.radius_m, 0, lang)} ${t("radius_approx_detail")}`
              : t("register_point_detail")
          }
        />
      </div>

      <p className="subtle-note">
        <Info size={13} />
        {c
          ? `${dayLabel(c.start_date, lang)} — ${dayLabel(c.end_date, lang)} · ${t("nasa_subtle_note_prefix")}`
          : t("no_measurements_fake")}
      </p>

      <div className="dashboard-grid">
        <section className="card section-pad">
          <div className="card-heading">
            <div>
              <h2>{t("rotation_card_title")}</h2>
              <p>{t("rotation_card_desc")}</p>
            </div>
            <Repeat2 size={19} />
          </div>
          {r?.candidates?.length ? (
            <>
              <div className="mini-candidates">
                {r.candidates.slice(0, 3).map((crop, i) => (
                  <div className="mini-crop" key={crop.id}>
                    <span>
                      {t("option_label")} 0{i + 1}
                    </span>
                    <Sprout />
                    <h3>{translateCropName(crop.name, lang)}</h3>
                    <p>{crop.family}</p>
                  </div>
                ))}
              </div>
              <div className="card-bottom">
                <span>
                  <ShieldCheck size={13} />
                  {t("eval_options")}
                </span>
                <button
                  className="inline-link"
                  onClick={() => onNavigate("rotation")}
                >
                  {t("view_explanation")}
                  <ArrowRight size={13} />
                </button>
              </div>
            </>
          ) : (
            <div className="rotation-empty">
              <Sprout />
              <p>
                {parcel
                  ? t("rotation_empty_has_parcel")
                  : t("rotation_empty_no_parcel")}
              </p>
              <button
                className="inline-link"
                onClick={() => (parcel ? onEdit(parcel) : onNew())}
              >
                {parcel ? t("complete_history") : t("register_plot")}
                <ArrowRight size={14} />
              </button>
            </div>
          )}
        </section>

        <section className="card map-card">
          <div className="card-heading">
            <div>
              <h2>{t("your_place_map")}</h2>
              <p>{parcel?.name || t("ref_unregistered")}</p>
            </div>
            <MapPin size={18} />
          </div>
          <PlotMap
            key={parcel?.id || "reference"}
            latitude={parcel?.latitude ?? -25.45}
            longitude={parcel?.longitude ?? -54.92}
            radius={parcel?.radius_m ?? 200}
            boundary={region?.boundary}
            compact
            lang={lang}
          />
          <div className="map-bottom">
            <span>
              {parcel
                ? `${number(parcel.latitude, 3, lang)}, ${number(parcel.longitude, 3, lang)}`
                : t("ref_minga")}
            </span>
            <button
              className="inline-link"
              onClick={() => (parcel ? onEdit(parcel) : onNew())}
            >
              {parcel ? t("complete_history") : t("register_plot")}
              <ArrowRight size={13} />
            </button>
          </div>
        </section>
      </div>

      <div className="dashboard-grid second-row">
        <section className="card section-pad">
          <div className="card-heading">
            <div>
              <h2>{t("climate_perspective")}</h2>
              <p>{t("climate_sub")}</p>
            </div>
            <button
              className="inline-link"
              onClick={() => onNavigate("climate")}
            >
              NASA POWER
              <ArrowRight size={13} />
            </button>
          </div>
          <ClimateChart climate={c} lang={lang} />
        </section>

        <section className="card section-pad">
          <div className="card-heading">
            <div>
              <h2>{t("every_data")}</h2>
              <p>{t("every_data_sub")}</p>
            </div>
            <Info size={18} />
          </div>
          <div className="data-status">
            <Satellite />
            <div>
              <strong>{t("nasa_climate")}</strong>
              <p>{c ? t("nasa_desc_has_climate") : t("nasa_pending")}</p>
            </div>
            <span className={`status-chip ${c ? "ready" : ""}`}>
              {c ? t("status_available") : t("status_pending")}
            </span>
          </div>
          <div className="data-status">
            <Leaf />
            <div>
              <strong>{t("crop_history")}</strong>
              <p>{t("crop_history_sub")}</p>
            </div>
            <span
              className={`status-chip ${parcel?.previous_crop ? "ready" : ""}`}
            >
              {parcel?.previous_crop
                ? t("status_registered")
                : t("status_pending")}
            </span>
          </div>
          <div className="data-status">
            <Layers />
            <div>
              <strong>{t("soil_fertility")}</strong>
              <p>{t("soil_fertility_sub")}</p>
            </div>
            <span className="status-chip">{t("status_undetermined")}</span>
          </div>
          {parcel && !c && (
            <button
              className="button button-soft mt-4"
              disabled={busy}
              onClick={onAnalyze}
            >
              {busy ? <LoaderCircle className="spin" /> : <RefreshCw />}
              {busy ? t("querying") : t("query_nasa")}
            </button>
          )}
        </section>
      </div>

      <section className="soil-strip">
        <Layers />
        <div>
          <h3>{t("soil_strip_title")}</h3>
          <p>{t("soil_strip_desc")}</p>
        </div>
        <button className="inline-link" onClick={() => onNavigate("soil")}>
          {t("soil_strip_btn")}
          <ArrowRight size={14} />
        </button>
      </section>
      {c && <SourceMeta climate={c} lang={lang} />}
    </>
  );
}

function Plots({
  parcels,
  onNew,
  onEdit,
  onSelect,
  onDelete,
  lang = "en",
  t = (k) => translations.en[k] || translations.es[k] || k,
}) {
  return (
    <>
      <div className="page-intro">
        <p className="eyebrow">{t("plots_eyebrow")}</p>
        <h1>{t("plots_title")}</h1>
        <p>{t("plots_desc")}</p>
      </div>
      {!parcels.length ? (
        <Empty onNew={onNew} lang={lang} t={t} />
      ) : (
        <div className="plot-grid">
          {parcels.map((p) => (
            <article className="card plot-card" key={p.id}>
              <div className="plot-cover">
                <MapPin />
              </div>
              <div className="section-pad">
                <span className="eyebrow">{t("plot_region_badge")}</span>
                <h2>{p.name}</h2>
                <p className="muted small mt-2">
                  {number(p.area_ha, 2, lang)} ha · {t("plot_radius_label")}{" "}
                  {number(p.radius_m, 0, lang)} m
                  <br />
                  {number(p.latitude, 4, lang)}, {number(p.longitude, 4, lang)}
                </p>
                <span
                  className={`status-chip mt-3 ${p.climate ? "ready" : ""}`}
                >
                  {p.climate ? t("nasa_data_saved") : t("nasa_query_pending")}
                </span>
                <div className="plot-actions">
                  <button
                    className="button button-green"
                    onClick={() => onSelect(p.id)}
                  >
                    {t("view_plot")}
                    <ArrowRight />
                  </button>
                  <button
                    className="icon-button"
                    onClick={() => onEdit(p)}
                    aria-label={`${t("edit_plot")} ${p.name}`}
                  >
                    <Pencil />
                  </button>
                  <button
                    className="icon-button danger"
                    onClick={() => onDelete(p)}
                    aria-label={`${t("delete_plot")} ${p.name}`}
                  >
                    <Trash2 />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

function Soil({
  parcel,
  onEdit,
  onNew,
  lang = "en",
  t = (k) => translations.en[k] || translations.es[k] || k,
}) {
  return (
    <>
      <div className="page-intro">
        <p className="eyebrow">{t("soil_eyebrow")}</p>
        <h1>{t("soil_title")}</h1>
        <p>{t("soil_desc")}</p>
      </div>
      {!parcel ? (
        <Empty onNew={onNew} lang={lang} t={t} />
      ) : (
        <>
          <div className="soil-facts">
            <div className="card section-pad">
              <Layers />
              <p>{t("observed_texture")}</p>
              <strong>{translateTexture(parcel.soil_texture, lang)}</strong>
            </div>
            <div className="card section-pad">
              <CloudRain />
              <p>{t("observed_drainage")}</p>
              <strong>{translateDrainage(parcel.drainage, lang)}</strong>
            </div>
            <div className="card section-pad">
              <Leaf />
              <p>{t("analysis_ph")}</p>
              <strong>{number(parcel.soil_ph, 1, lang)}</strong>
              <small>
                {parcel.soil_test_date
                  ? t("measured_on").replace(
                      "{date}",
                      dayLabel(parcel.soil_test_date, lang),
                    )
                  : t("no_measurement")}
              </small>
            </div>
          </div>
          <section className="card section-pad mt-5">
            <h2>{t("fertility_not_determined")}</h2>
            <p className="muted mt-3">{t("fertility_desc_1")}</p>
            <p className="muted small mt-3">{t("fertility_desc_2")}</p>
          </section>
          <section className="soil-strip">
            <Layers />
            <div>
              <h3>{t("soil_next_step_title")}</h3>
              <p>{t("soil_next_step_desc")}</p>
            </div>
          </section>
          <button
            className="button button-green mt-5"
            onClick={() => onEdit(parcel)}
          >
            <Pencil />
            {t("update_soil_btn")}
          </button>
          {parcel.notes && (
            <section className="card section-pad mt-5">
              <h2>{t("field_observations")}</h2>
              <p className="muted mt-3 whitespace-pre-wrap">{parcel.notes}</p>
            </section>
          )}
        </>
      )}
    </>
  );
}

function Sources({
  lang = "en",
  t = (k) => translations.en[k] || translations.es[k] || k,
}) {
  const articles = [
    [
      Satellite,
      SOURCES_ARTICLES[0].title[lang],
      SOURCES_ARTICLES[0].text[lang],
      SOURCES_ARTICLES[0].url,
    ],
    [
      Globe2,
      SOURCES_ARTICLES[1].title[lang],
      SOURCES_ARTICLES[1].text[lang],
      SOURCES_ARTICLES[1].url,
    ],
    [
      Repeat2,
      SOURCES_ARTICLES[2].title[lang],
      SOURCES_ARTICLES[2].text[lang],
      SOURCES_ARTICLES[2].url,
    ],
    [
      BookOpen,
      SOURCES_ARTICLES[3].title[lang],
      SOURCES_ARTICLES[3].text[lang],
      SOURCES_ARTICLES[3].url,
    ],
    [
      Info,
      SOURCES_ARTICLES[4].title[lang],
      SOURCES_ARTICLES[4].text[lang],
      SOURCES_ARTICLES[4].url,
    ],
    [
      ShieldCheck,
      SOURCES_ARTICLES[5].title[lang],
      SOURCES_ARTICLES[5].text[lang],
      SOURCES_ARTICLES[5].url,
    ],
  ];

  return (
    <>
      <div className="page-intro">
        <p className="eyebrow">{t("sources_eyebrow")}</p>
        <h1>{t("sources_title")}</h1>
        <p>{t("sources_desc")}</p>
      </div>
      <div className="sources-grid">
        {articles.map(([Icon, title, text, url]) => (
          <article className="card section-pad" key={title}>
            <Icon className="article-icon" />
            <h2>{title}</h2>
            <p>{text}</p>
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="inline-link mt-4"
              >
                {t("consult_source")}
                <ArrowRight size={13} />
              </a>
            )}
          </article>
        ))}
      </div>
      <div className="warning mt-5">
        <Info />
        <div>
          <strong>{t("future_title")}</strong>
          <p>{t("future_desc")}</p>
        </div>
      </div>
      <p className="subtle-note mt-5">{t("sources_footnote_1")}</p>
      <p className="subtle-note mt-3">{t("sources_footnote_2")}</p>
    </>
  );
}

export default function App({ initialState }) {
  const [parcels, setParcels] = useState(initialState.parcels || []),
    [activeId, setActiveId] = useState(initialState.parcels?.[0]?.id || null),
    [view, setView] = useState("dashboard");
  const [modal, setModal] = useState(false),
    [editing, setEditing] = useState(null),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [menu, setMenu] = useState(false),
    [error, setError] = useState("");

  // The first browser render must match the HTML sent by SSR.
  const [lang, setLang] = useState(
    initialState.initialLang === "es" ? "es" : "en",
  );
  const [darkMode, setDarkMode] = useState(false);
  const themeReady = useRef(false);
  useEffect(() => {
    try {
      setDarkMode(localStorage.getItem("agroshift_theme") === "dark");
      const savedLang = localStorage.getItem("agroshift_lang");
      if (savedLang === "es" || savedLang === "en") setLang(savedLang);
    } catch {
      /* Browser storage may be disabled. */
    }
  }, []);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", darkMode);
      document.documentElement.setAttribute(
        "data-theme",
        darkMode ? "dark" : "light",
      );
      if (themeReady.current) {
        try {
          localStorage.setItem("agroshift_theme", darkMode ? "dark" : "light");
        } catch {}
      }
      themeReady.current = true;
    }
  }, [darkMode]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const t = (key) =>
    translations[lang]?.[key] ||
    translations.en[key] ||
    translations.es[key] ||
    key;

  const handleLanguageChange = (newLang) => {
    setLang(newLang);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("agroshift_lang", newLang);
      } catch {}
      document.cookie = `agroshift_lang=${newLang};path=/;max-age=31536000`;
    }
  };

  const toggleDarkMode = () => {
    setDarkMode((prev) => !prev);
  };

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const NAV = NAV_DEFS.map(([id, key, Icon]) => [id, t(key), Icon]);
  const parcel = parcels.find((p) => p.id === activeId) || parcels[0] || null;
  const region = initialState.region,
    period = initialState.default_period;

  useEffect(() => {
    if (notice) {
      const id = setTimeout(() => setNotice(""), 8000);
      return () => clearTimeout(id);
    }
  }, [notice]);

  function navigate(route) {
    setView(route);
    setMenu(false);
    setError("");
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function openForm(p) {
    setEditing(p || null);
    setModal(true);
  }

  function replaceParcel(p) {
    setParcels((items) => [p, ...items.filter((x) => x.id !== p.id)]);
    setActiveId(p.id);
  }

  async function analyze(dates = period, refresh = false) {
    if (!parcel || busy) return;
    const id = parcel.id;
    setBusy(true);
    setError("");
    try {
      const result = await request(`/api/parcels/${id}/analyze`, {
        method: "POST",
        body: JSON.stringify({ ...dates, refresh }),
      });
      setParcels((items) => items.map((p) => (p.id === id ? result : p)));
      setNotice(
        result.climate.stale ? t("stale_data_saved") : t("real_data_saved"),
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(p) {
    if (!window.confirm(t("confirm_delete").replace("{name}", p.name))) return;
    try {
      await request(`/api/parcels/${p.id}`, { method: "DELETE" });
      setParcels((items) => items.filter((x) => x.id !== p.id));
      setNotice(t("parcel_deleted"));
    } catch (e) {
      setError(e.message);
    }
  }

  let content;
  if (initialState.error)
    content = (
      <div className="empty-state">
        <AlertTriangle />
        <h2>{t("reconnect_title")}</h2>
        <p>{initialState.error}</p>
        <button
          className="button button-green"
          onClick={() => window.location.reload()}
        >
          {t("retry")}
          <RefreshCw />
        </button>
      </div>
    );
  else if (view === "dashboard")
    content = (
      <Dashboard
        {...{ parcels, parcel, region, busy }}
        onNew={openForm}
        onEdit={openForm}
        onNavigate={navigate}
        onAnalyze={() => analyze()}
        lang={lang}
        t={t}
      />
    );
  else if (view === "parcels")
    content = (
      <Plots
        parcels={parcels}
        onNew={openForm}
        onEdit={openForm}
        onSelect={(id) => {
          setActiveId(id);
          navigate("dashboard");
        }}
        onDelete={remove}
        lang={lang}
        t={t}
      />
    );
  else if (view === "rotation")
    content = <Rotation parcel={parcel} onEdit={openForm} lang={lang} />;
  else if (view === "climate")
    content = parcel ? (
      <Environment
        key={parcel.id}
        parcel={parcel}
        period={period}
        onAnalyze={analyze}
        busy={busy}
        lang={lang}
      />
    ) : (
      <Empty
        onNew={openForm}
        title={t("climate_empty_1")}
        text={t("climate_empty_2")}
        lang={lang}
        t={t}
      />
    );
  else if (view === "soil")
    content = (
      <Soil
        parcel={parcel}
        onEdit={openForm}
        onNew={openForm}
        lang={lang}
        t={t}
      />
    );
  else content = <Sources lang={lang} t={t} />;

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menu ? "open" : ""}`}>
        <a className="brand" href="/" aria-label="AgroShift PY">
          <img src="/icon.svg" alt="" />
          <span>
            AgroShift<b>PY</b>
          </span>
        </a>
        <p className="brand-tag">{t("tagline")}</p>
        <p className="nav-caption">{t("nav_crop_space")}</p>
        <nav aria-label="Navegación principal">
          {NAV.map(([id, label, Icon]) => (
            <button
              key={id}
              className={`nav-item ${view === id ? "active" : ""}`}
              onClick={() => navigate(id)}
              aria-current={view === id ? "page" : undefined}
            >
              <Icon size={18} />
              {label}
              {id === "parcels" && (
                <span className="nav-count">{parcels.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="mission-note">
            <Satellite />
            <strong>{t("pilot_note")}</strong>
            <p>
              {t("pilot_desc")
                .split("\n")
                .map((line, idx) => (
                  <React.Fragment key={idx}>
                    {line}
                    <br />
                  </React.Fragment>
                ))}
            </p>
          </div>
          <p>
            <ShieldCheck size={13} />
            {t("data_saved")}
          </p>
        </div>
      </aside>

      {menu && (
        <button
          className="menu-scrim"
          onClick={() => setMenu(false)}
          aria-label={t("close_menu")}
        />
      )}

      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="icon-button mobile-menu"
              onClick={() => setMenu((x) => !x)}
              aria-label={t("open_menu")}
              aria-expanded={menu}
            >
              {menu ? <X /> : <Menu />}
            </button>
            <Home size={15} />
            <span>AgroShift PY</span>
            <ChevronRight size={12} />
            <strong>{NAV.find((x) => x[0] === view)?.[1]}</strong>
          </div>
          <div className="topbar-right">
            <span
              className={`connection ${initialState.error ? "disconnected" : ""}`}
            >
              <i />
              {initialState.error ? t("server_offline") : t("team_workspace")}
            </span>
            <div className="lang-switcher">
              <button
                type="button"
                className={`lang-btn ${lang === "es" ? "active" : ""}`}
                onClick={() => handleLanguageChange("es")}
                title="Español"
              >
                ES
              </button>
              <span className="lang-divider">/</span>
              <button
                type="button"
                className={`lang-btn ${lang === "en" ? "active" : ""}`}
                onClick={() => handleLanguageChange("en")}
                title="English"
              >
                EN
              </button>
            </div>
            <div className="avatar-dropdown-wrap" ref={dropdownRef}>
              <button
                type="button"
                className={`avatar-button ${dropdownOpen ? "active" : ""}`}
                onClick={() => setDropdownOpen((prev) => !prev)}
                aria-label={t("user_menu")}
                aria-expanded={dropdownOpen}
              >
                AP
              </button>
              {dropdownOpen && (
                <div className="user-dropdown-menu">
                  <div className="dropdown-user-header">
                    <strong>{t("user_team")}</strong>
                    <span>admin</span>
                  </div>
                  <div className="dropdown-divider" />
                  <button
                    type="button"
                    className="dropdown-item"
                    onClick={toggleDarkMode}
                  >
                    {darkMode ? <Sun size={15} /> : <Moon size={15} />}
                    <span>{darkMode ? t("light_mode") : t("dark_mode")}</span>
                  </button>
                  <div className="dropdown-divider" />
                  <a href="/logout" className="dropdown-item dropdown-logout">
                    <LogOut size={15} />
                    <span>{t("logout")}</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="main-content">
          <div className="page-top">
            <div>
              <p className="eyebrow">{t("pilot_title")}</p>
              <h2>{NAV.find((x) => x[0] === view)?.[1]}</h2>
            </div>
            <button
              className="button button-green"
              disabled={!region}
              onClick={() => openForm()}
            >
              <Plus />
              {t("new_parcel")}
            </button>
          </div>

          {parcels.length > 0 && (
            <div className="active-plot-bar">
              <MapPin size={14} />
              <label htmlFor="active-plot">{t("active_parcel_label")}</label>
              <select
                id="active-plot"
                value={parcel?.id || ""}
                onChange={(e) => setActiveId(e.target.value)}
              >
                {parcels.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <span>
                {number(parcel?.area_ha, 2, lang)} {t("approx_label")}
              </span>
            </div>
          )}

          {error && (
            <div className="error mb-5" role="alert">
              <AlertTriangle size={18} />
              <span>{error}</span>
              <button
                onClick={() => setError("")}
                aria-label={t("close_notice")}
              >
                <X size={16} />
              </button>
            </div>
          )}

          <div key={view} className="page-content">
            {content}
          </div>

          <footer className="footer">
            <span>
              AgroShift PY <i />
              {t("footer_text_1")}
            </span>
            <p>{t("footer_text_2")}</p>
          </footer>
        </main>
      </div>

      {modal && (
        <PlotForm
          parcel={editing}
          crops={initialState.crops}
          boundary={region?.boundary}
          period={period}
          onClose={() => setModal(false)}
          onSaved={(p, n) => {
            replaceParcel(p);
            setModal(false);
            setNotice(n);
            navigate("rotation");
          }}
          lang={lang}
        />
      )}

      {notice && (
        <div className="toast" role="status">
          <Check size={17} />
          {notice}
          <button onClick={() => setNotice("")} aria-label={t("close_notice")}>
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
