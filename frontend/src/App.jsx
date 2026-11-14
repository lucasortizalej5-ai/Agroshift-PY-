import React, { useState, useEffect } from "react";
import {
  Home,
  Map,
  Leaf,
  Repeat2,
  Sun,
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
  ChevronDown,
  Sprout,
  Database,
} from "lucide-react";
import PlotForm from "./components/PlotForm.jsx";
import PlotMap from "./components/Map.jsx";
import Environment, {
  ClimateChart,
  SourceMeta,
} from "./components/Environment.jsx";
import Rotation from "./components/Rotation.jsx";
import { request, number, dayLabel } from "./api.js";

const NAV = [
  ["dashboard", "Mi campo", Home],
  ["parcels", "Mis parcelas", Map],
  ["rotation", "Rotación de cultivos", Repeat2],
  ["climate", "Clima y datos NASA", Sun],
  ["soil", "Mi suelo", Layers],
  ["sources", "Fuentes y metodología", BookOpen],
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
  title = "Tu campo empieza acá.",
  text = "Registrá una parcela y su cultivo anterior. Consultaremos datos reales de NASA para ayudarte a explorar el próximo paso.",
}) {
  return (
    <div className="empty-state">
      <Sprout />
      <h2>{title}</h2>
      <p>{text}</p>
      <button className="button button-green" onClick={() => onNew()}>
        Registrar mi primera parcela
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
}) {
  const c = parcel?.climate,
    s = c?.summary,
    r = parcel?.recommendation;
  const complete = (p) =>
    s?.[p]
      ? `${s[p].valid_days}/${s[p].expected_days} días válidos`
      : "Todavía sin consulta NASA";
  return (
    <>
      <section className="hero-card">
        <div className="hero-copy">
          <span className="hero-badge">
            <Satellite size={13} />
            CON DATOS DE NASA POWER
          </span>
          <h1>
            Una mejor decisión,
            <br />
            <span>una tierra más sana.</span>
          </h1>
          <p>
            Conectá tu parcela con la ciencia del espacio. Explorá qué cultivar
            después, con datos reales y una explicación para cada paso.
          </p>
          <div className="hero-actions">
            <button className="button button-yellow" onClick={() => onNew()}>
              <Leaf />
              Planificar mi rotación
              <ArrowRight />
            </button>
            <button
              className="hero-secondary"
              onClick={() => onNavigate("sources")}
            >
              Conocer el proyecto
            </button>
          </div>
        </div>
        <div
          className="hero-image"
          role="img"
          aria-label="Paisaje de campos agrícolas"
        >
          <div className="orbit">
            <span>NASA POWER</span>
          </div>
          <div className="hero-caption">
            <Globe2 size={26} />
            <p>
              Agricultura con los pies en la tierra.
              <br />Y la mirada en el espacio.
            </p>
          </div>
        </div>
      </section>
      <div className="section-heading">
        <div>
          <h2>Una mirada a tu campo</h2>
          <p>
            {parcels.length}{" "}
            {parcels.length === 1
              ? "parcela registrada"
              : "parcelas registradas"}{" "}
            · {parcel?.name || "Empecemos por conocer tu terreno"}
          </p>
        </div>
        <span className="location-badge">
          <MapPin size={13} />
          Alto Paraná, Paraguay
        </span>
      </div>
      <div className="metric-grid">
        <Metric
          label="Temperatura media"
          value={number(s?.T2M?.value)}
          unit="°C"
          icon={Thermometer}
          detail={complete("T2M")}
        />
        <Metric
          label="Lluvia acumulada"
          value={number(s?.PRECTOTCORR?.value)}
          unit="mm"
          icon={CloudRain}
          detail={complete("PRECTOTCORR")}
        />
        <Metric
          label="Humedad del aire"
          value={number(s?.RH2M?.value, 0)}
          unit="%"
          icon={Wind}
          detail={complete("RH2M")}
        />
        <Metric
          label="Superficie de la parcela"
          value={number(parcel?.area_ha, 2)}
          unit="ha"
          icon={Layers}
          detail={
            parcel
              ? `${number(parcel.radius_m, 0)} m de radio · área aproximada`
              : "Registrá un punto y su radio"
          }
        />
      </div>
      <p className="subtle-note">
        <Info size={13} />
        {c
          ? `${dayLabel(c.start_date)} a ${dayLabel(c.end_date)} · Resúmenes de estimaciones NASA. No son pronósticos.`
          : "No mostramos valores de ejemplo como si fueran mediciones de tu parcela."}
      </p>
      <div className="dashboard-grid">
        <section className="card section-pad">
          <div className="card-heading">
            <div>
              <h2>Dale un nuevo ciclo a tu tierra</h2>
              <p>Un primer paso: alternar familias de cultivos.</p>
            </div>
            <Repeat2 size={19} />
          </div>
          {r?.candidates?.length ? (
            <>
              <div className="mini-candidates">
                {r.candidates.slice(0, 3).map((crop, i) => (
                  <div className="mini-crop" key={crop.id}>
                    <span>OPCIÓN 0{i + 1}</span>
                    <Sprout />
                    <h3>{crop.name}</h3>
                    <p>{crop.family}</p>
                  </div>
                ))}
              </div>
              <div className="card-bottom">
                <span>
                  <ShieldCheck size={13} />
                  Opciones para evaluar, sin ranking
                </span>
                <button
                  className="inline-link"
                  onClick={() => onNavigate("rotation")}
                >
                  Ver explicación
                  <ArrowRight size={13} />
                </button>
              </div>
            </>
          ) : (
            <div className="rotation-empty">
              <Sprout />
              <p>
                {parcel
                  ? "Agregá el cultivo anterior para explorar otras familias."
                  : "Conocé las posibilidades de tu próximo ciclo."}
              </p>
              <button
                className="inline-link"
                onClick={() => (parcel ? onEdit(parcel) : onNew())}
              >
                {parcel ? "Completar historial" : "Registrar mi parcela"}
                <ArrowRight size={14} />
              </button>
            </div>
          )}
        </section>
        <section className="card map-card">
          <div className="card-heading">
            <div>
              <h2>Tu lugar en el mapa</h2>
              <p>{parcel?.name || "Ubicación de referencia · no registrada"}</p>
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
          />
          <div className="map-bottom">
            <span>
              {parcel
                ? `${number(parcel.latitude, 3)}, ${number(parcel.longitude, 3)}`
                : "Referencia: Minga Guazú"}
            </span>
            <button
              className="inline-link"
              onClick={() => (parcel ? onEdit(parcel) : onNew())}
            >
              {parcel ? "Editar ubicación" : "Elegir mi ubicación"}
              <ArrowRight size={13} />
            </button>
          </div>
        </section>
      </div>
      <div className="dashboard-grid second-row">
        <section className="card section-pad">
          <div className="card-heading">
            <div>
              <h2>El clima, en perspectiva</h2>
              <p>Datos diarios del período consultado.</p>
            </div>
            <button
              className="inline-link"
              onClick={() => onNavigate("climate")}
            >
              NASA POWER
              <ArrowRight size={13} />
            </button>
          </div>
          <ClimateChart climate={c} />
        </section>
        <section className="card section-pad">
          <div className="card-heading">
            <div>
              <h2>Cada dato tiene su lugar</h2>
              <p>Ciencia clara, sin confundir estimaciones.</p>
            </div>
            <Info size={18} />
          </div>
          <div className="data-status">
            <Satellite />
            <div>
              <strong>Clima de NASA</strong>
              <p>
                {c
                  ? "Estimaciones meteorológicas con fuente y fecha."
                  : "Pendiente de consulta para tu parcela."}
              </p>
            </div>
            <span className={`status-chip ${c ? "ready" : ""}`}>
              {c ? "Disponible" : "Pendiente"}
            </span>
          </div>
          <div className="data-status">
            <Leaf />
            <div>
              <strong>Historial del cultivo</strong>
              <p>Información que aporta el productor.</p>
            </div>
            <span
              className={`status-chip ${parcel?.previous_crop ? "ready" : ""}`}
            >
              {parcel?.previous_crop ? "Registrado" : "Pendiente"}
            </span>
          </div>
          <div className="data-status">
            <Layers />
            <div>
              <strong>Fertilidad nutricional</strong>
              <p>Requiere un análisis de suelo completo.</p>
            </div>
            <span className="status-chip">Sin determinar</span>
          </div>
          {parcel && !c && (
            <button
              className="button button-soft mt-4"
              disabled={busy}
              onClick={onAnalyze}
            >
              {busy ? <LoaderCircle className="spin" /> : <RefreshCw />}
              {busy ? "Consultando…" : "Consultar NASA"}
            </button>
          )}
        </section>
      </div>
      <section className="soil-strip">
        <Layers />
        <div>
          <h3>Lo que sabemos. Lo que falta medir.</h3>
          <p>
            Los datos del espacio aportan contexto. Conocer la fertilidad
            requiere analizar tu suelo.
          </p>
        </div>
        <button className="inline-link" onClick={() => onNavigate("soil")}>
          Ver información del suelo
          <ArrowRight size={14} />
        </button>
      </section>
      {c && <SourceMeta climate={c} />}
    </>
  );
}
function Plots({ parcels, onNew, onEdit, onSelect, onDelete }) {
  return (
    <>
      <div className="page-intro">
        <p className="eyebrow">TU ESPACIO DE CULTIVO</p>
        <h1>Tus parcelas, en un solo lugar.</h1>
        <p>
          Ubicación, historial y datos ambientales. La información queda
          guardada en esta instalación.
        </p>
      </div>
      {!parcels.length ? (
        <Empty onNew={onNew} />
      ) : (
        <div className="plot-grid">
          {parcels.map((p) => (
            <article className="card plot-card" key={p.id}>
              <div className="plot-cover">
                <MapPin />
              </div>
              <div className="section-pad">
                <span className="eyebrow">ALTO PARANÁ</span>
                <h2>{p.name}</h2>
                <p className="muted small mt-2">
                  {number(p.area_ha, 2)} ha · radio de {number(p.radius_m, 0)} m
                  <br />
                  {number(p.latitude, 4)}, {number(p.longitude, 4)}
                </p>
                <span
                  className={`status-chip mt-3 ${p.climate ? "ready" : ""}`}
                >
                  {p.climate
                    ? "Datos NASA guardados"
                    : "Consulta NASA pendiente"}
                </span>
                <div className="plot-actions">
                  <button
                    className="button button-green"
                    onClick={() => onSelect(p.id)}
                  >
                    Ver parcela
                    <ArrowRight />
                  </button>
                  <button
                    className="icon-button"
                    onClick={() => onEdit(p)}
                    aria-label={`Editar ${p.name}`}
                  >
                    <Pencil />
                  </button>
                  <button
                    className="icon-button danger"
                    onClick={() => onDelete(p)}
                    aria-label={`Eliminar ${p.name}`}
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
function Soil({ parcel, onEdit, onNew }) {
  return (
    <>
      <div className="page-intro">
        <p className="eyebrow">INFORMACIÓN APORTADA POR EL PRODUCTOR</p>
        <h1>Un suelo sano empieza por conocerlo.</h1>
        <p>
          Registrá lo que observás y lo que mediste. Los datos de NASA POWER no
          determinan la composición nutricional del terreno.
        </p>
      </div>
      {!parcel ? (
        <Empty onNew={onNew} />
      ) : (
        <>
          <div className="soil-facts">
            <div className="card section-pad">
              <Layers />
              <p>Textura observada</p>
              <strong>{parcel.soil_texture}</strong>
            </div>
            <div className="card section-pad">
              <CloudRain />
              <p>Drenaje observado</p>
              <strong>{parcel.drainage}</strong>
            </div>
            <div className="card section-pad">
              <Leaf />
              <p>pH del análisis</p>
              <strong>{number(parcel.soil_ph)}</strong>
              <small>
                {parcel.soil_test_date
                  ? "Medido el " + dayLabel(parcel.soil_test_date)
                  : "Sin medición registrada"}
              </small>
            </div>
          </div>
          <section className="card section-pad mt-5">
            <h2>Fertilidad nutricional: no determinada</h2>
            <p className="muted mt-3">
              No calculamos nitrógeno, fósforo, potasio ni dosis de
              fertilizantes. Un valor de pH tampoco reemplaza un análisis
              nutricional completo.
            </p>
            <p className="muted small mt-3">
              La textura y el drenaje se guardan como observaciones. Esta
              primera versión no los usa para calcular agua disponible ni
              aptitud de cultivos.
            </p>
          </section>
          <section className="soil-strip">
            <Layers />
            <div>
              <h3>El próximo paso: una muestra de suelo.</h3>
              <p>
                Consultá a un laboratorio o técnico local para definir el
                muestreo, la interpretación y el manejo.
              </p>
            </div>
          </section>
          <button
            className="button button-green mt-5"
            onClick={() => onEdit(parcel)}
          >
            <Pencil />
            Actualizar datos de suelo
          </button>
          {parcel.notes && (
            <section className="card section-pad mt-5">
              <h2>Observaciones del terreno</h2>
              <p className="muted mt-3 whitespace-pre-wrap">{parcel.notes}</p>
            </section>
          )}
        </>
      )}
    </>
  );
}
function Sources() {
  const articles = [
    [
      Satellite,
      "Clima real, con una fuente identificable",
      "NASA POWER aporta series diarias de temperatura media, máxima y mínima, precipitación corregida y humedad relativa del aire. Son estimaciones meteorológicas basadas en modelos y asimilación de observaciones; no son sensores instalados en tu terreno.",
      "https://power.larc.nasa.gov/docs/services/api/temporal/daily/",
    ],
    [
      Globe2,
      "La escala importa",
      "La grilla meteorológica nativa tiene aproximadamente 0,5° de latitud × 0,625° de longitud. Parcelas cercanas pueden compartir valores. Consultamos el centro del círculo; su radio no vuelve más precisos los datos.",
      "https://power.larc.nasa.gov/docs/methodology/data/sources_meteorology/",
    ],
    [
      Repeat2,
      "Rotaciones con reglas explícitas",
      "El catálogo inicial contiene soja, maíz, trigo, mandioca y poroto. El filtro evita repetir inmediatamente el cultivo y prioriza familias diferentes. Ofrece opciones sin ranking. No determina aptitud, rendimiento ni fechas de siembra.",
      "https://www.nrcs.usda.gov/sites/default/files/2022-10/National-Agronomy-Manual.pdf",
    ],
    [
      BookOpen,
      "Del espacio a una mejor pregunta",
      "La investigación difundida por NASA muestra que la rotación debe considerar el contexto y que sus resultados varían. Este MVP usa NASA como contexto ambiental y el historial declarado para una primera diversificación; necesita validación agronómica local.",
      "https://science.nasa.gov/earth/earth-observatory/how-to-rotate-crops-154601/",
    ],
    [
      Info,
      "Datos faltantes, a la vista",
      "No interpolamos valores ni reemplazamos faltantes por cero. Los promedios indican cuántos días válidos utilizan. La lluvia total del período se muestra solo si todos sus días tienen datos válidos. La copia de una consulta fallida se identifica con su fecha original.",
      null,
    ],
    [
      ShieldCheck,
      "Tus datos y esta instalación",
      "Esta etapa es de uso de un equipo. Las parcelas se guardan en SQLite en el servidor local; no hay cuentas individuales. Para publicar el contenedor se exige acceso protegido. NASA recibe las coordenadas consultadas y OpenStreetMap las solicitudes de mapas.",
      null,
    ],
  ];
  return (
    <>
      <div className="page-intro">
        <p className="eyebrow">CIENCIA QUE PODÉS REVISAR</p>
        <h1>Cada recomendación tiene un porqué.</h1>
        <p>Una fuente, una regla y un límite. Conocelos antes de decidir.</p>
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
                Consultar fuente
                <ArrowRight size={13} />
              </a>
            )}
          </article>
        ))}
      </div>
      <div className="warning mt-5">
        <Info />
        <div>
          <strong>Lo que viene después de este primer MVP</strong>
          <p>
            Riego con balance hídrico y supuestos explícitos, orientación
            nutricional con análisis de suelo, indicadores de riesgos validados
            y ventanas de cosecha por variedad y fecha de siembra. GPM y SMAP
            están evaluados en la documentación, todavía sin integrar.
          </p>
        </div>
      </div>
      <p className="subtle-note mt-5">
        Cartografía: © OpenStreetMap contributors y geoBoundaries (CC BY 4.0),
        límite departamental de referencia 2012. La delimitación es aproximada.
        Fotografía: paisaje ilustrativo de Unsplash; no corresponde a la parcela
        registrada.
      </p>
      <p className="subtle-note mt-3">
        Proyecto independiente. El uso de datos de NASA no implica aval
        institucional de NASA.
      </p>
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
        result.climate.stale
          ? "No se pudo actualizar: se conservó una copia anterior de esta consulta."
          : "Datos reales de NASA POWER consultados y guardados.",
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function remove(p) {
    if (!window.confirm(`¿Eliminar «${p.name}» y su consulta guardada?`))
      return;
    try {
      await request(`/api/parcels/${p.id}`, { method: "DELETE" });
      setParcels((items) => items.filter((x) => x.id !== p.id));
      setNotice("Parcela eliminada.");
    } catch (e) {
      setError(e.message);
    }
  }
  let content;
  if (initialState.error)
    content = (
      <div className="empty-state">
        <AlertTriangle />
        <h2>Necesitamos conectar el servidor.</h2>
        <p>{initialState.error}</p>
        <button
          className="button button-green"
          onClick={() => window.location.reload()}
        >
          Reintentar
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
      />
    );
  else if (view === "rotation")
    content = <Rotation parcel={parcel} onEdit={openForm} />;
  else if (view === "climate")
    content = parcel ? (
      <Environment
        key={parcel.id}
        parcel={parcel}
        period={period}
        onAnalyze={analyze}
        busy={busy}
      />
    ) : (
      <Empty
        onNew={openForm}
        title="Un lugar para conectar los datos."
        text="Registrá una parcela para consultar su punto central en NASA POWER."
      />
    );
  else if (view === "soil")
    content = <Soil parcel={parcel} onEdit={openForm} onNew={openForm} />;
  else content = <Sources />;
  return (
    <div className="app-shell">
      <aside className={`sidebar ${menu ? "open" : ""}`}>
        <a className="brand" href="/" aria-label="AgroShift PY inicio">
          <img src="/icon.svg" alt="" />
          <span>
            AgroShift<b>PY</b>
          </span>
        </a>
        <p className="brand-tag">DEL ESPACIO A TU TIERRA</p>
        <p className="nav-caption">TU ESPACIO DE CULTIVO</p>
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
            <strong>PILOTO · ALTO PARANÁ</strong>
            <p>
              Agricultura informada.
              <br />
              Tierra más resiliente.
            </p>
          </div>
          <p>
            <ShieldCheck size={13} />
            Datos guardados en esta instalación
          </p>
        </div>
      </aside>
      {menu && (
        <button
          className="menu-scrim"
          onClick={() => setMenu(false)}
          aria-label="Cerrar menú"
        />
      )}
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="icon-button mobile-menu"
              onClick={() => setMenu((x) => !x)}
              aria-label="Abrir menú"
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
              {initialState.error
                ? "Servidor sin conexión"
                : "Tu espacio de equipo"}
            </span>
            <span className="lang-tag">ES</span>
            <span className="avatar">AP</span>
          </div>
        </header>
        <main className="main-content">
          <div className="page-top">
            <div>
              <p className="eyebrow">PILOTO · ALTO PARANÁ, PARAGUAY</p>
              <h2>{NAV.find((x) => x[0] === view)?.[1]}</h2>
            </div>
            <button
              className="button button-green"
              disabled={!region}
              onClick={() => openForm()}
            >
              <Plus />
              Nueva parcela
            </button>
          </div>
          {parcels.length > 0 && (
            <div className="active-plot-bar">
              <MapPin size={14} />
              <label htmlFor="active-plot">Parcela activa</label>
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
              <span>{number(parcel?.area_ha, 2)} ha aprox.</span>
            </div>
          )}
          {error && (
            <div className="error mb-5" role="alert">
              <AlertTriangle size={18} />
              <span>{error}</span>
              <button onClick={() => setError("")} aria-label="Cerrar aviso">
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
              Agricultura informada, tierra resiliente.
            </span>
            <p>Proyecto independiente · Datos NASA, decisiones explicadas.</p>
          </footer>
        </main>
      </div>
      {modal && (
        <PlotForm
          parcel={editing}
          crops={initialState.crops}
          boundary={region.boundary}
          period={period}
          onClose={() => setModal(false)}
          onSaved={(p, n) => {
            replaceParcel(p);
            setModal(false);
            setNotice(n);
            navigate("rotation");
          }}
        />
      )}
      {notice && (
        <div className="toast" role="status">
          <Check size={17} />
          {notice}
          <button onClick={() => setNotice("")} aria-label="Cerrar aviso">
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
