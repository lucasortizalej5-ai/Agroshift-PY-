import React, { useState } from "react";
import {
  Info,
  ExternalLink,
  RefreshCw,
  LoaderCircle,
  CalendarDays,
  CloudRain,
} from "lucide-react";
import { number, dayLabel } from "../api.js";

export function ClimateChart({ climate }) {
  if (!climate)
    return (
      <div className="chart-empty">
        <CloudRain />
        <p>El clima de tu parcela aparecerá acá.</p>
        <span>
          Consultá NASA POWER para ver datos reales del período elegido.
        </span>
      </div>
    );
  const rows = climate.daily,
    w = 690,
    h = 220,
    left = 36,
    right = 35,
    top = 20,
    bottom = 34;
  const cw = w - left - right,
    ch = h - top - bottom;
  const rainfall = rows.map((d) => d.PRECTOTCORR).filter((v) => v !== null),
    temps = rows.map((d) => d.T2M).filter((v) => v !== null);
  const maxRain = Math.max(10, Math.ceil(Math.max(0, ...rainfall) / 10) * 10);
  const minTemp = Math.min(0, Math.floor(Math.min(0, ...temps) / 10) * 10),
    maxTemp = Math.max(30, Math.ceil(Math.max(0, ...temps) / 10) * 10);
  const x = (i) => left + ((i + 0.5) * cw) / rows.length;
  const tempY = (v) => top + ch - ((v - minTemp) / (maxTemp - minTemp)) * ch;
  const segments = [];
  let points = [];
  rows.forEach((d, i) => {
    if (d.T2M === null) {
      if (points.length) segments.push(points.join(" "));
      points = [];
    } else points.push(`${x(i)},${tempY(d.T2M)}`);
  });
  if (points.length) segments.push(points.join(" "));
  return (
    <>
      <div className="chart-legend">
        <span>
          <i />
          Lluvia diaria (mm/día)
        </span>
        <span>
          <i className="line" />
          Temperatura media (°C)
        </span>
      </div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="climate-chart"
        role="img"
        aria-label={`Temperatura media y lluvia diaria entre ${climate.start_date} y ${climate.end_date}. Datos faltantes sin interpolación.`}
      >
        {[0, 0.25, 0.5, 0.75, 1].map((v) => (
          <g key={v}>
            <line
              className="chart-grid"
              x1={left}
              x2={w - right}
              y1={top + ch - v * ch}
              y2={top + ch - v * ch}
            />
            <text
              className="chart-label"
              x={left - 8}
              y={top + ch - v * ch + 3}
              textAnchor="end"
            >
              {number(maxRain * v, 0)}
            </text>
            <text
              className="chart-label"
              x={w - right + 8}
              y={top + ch - v * ch + 3}
            >
              {number(minTemp + (maxTemp - minTemp) * v, 0)}°
            </text>
          </g>
        ))}
        {rows.map((d, i) => (
          <g key={d.date}>
            {d.PRECTOTCORR !== null && (
              <rect
                x={x(i) - Math.max(1, (cw / rows.length) * 0.3)}
                y={top + ch - (d.PRECTOTCORR / maxRain) * ch}
                height={(d.PRECTOTCORR / maxRain) * ch}
                width={Math.max(2, (cw / rows.length) * 0.6)}
                rx={2}
                fill="#becd9b"
              >
                <title>
                  {d.date}: {number(d.PRECTOTCORR)} mm/día; {number(d.T2M)} °C
                </title>
              </rect>
            )}
            {(i === 0 ||
              i === rows.length - 1 ||
              i === Math.floor(rows.length / 2)) && (
              <text
                className="chart-label"
                x={x(i)}
                y={h - 10}
                textAnchor="middle"
              >
                {d.date.slice(8)}/{d.date.slice(5, 7)}
              </text>
            )}
          </g>
        ))}
        {segments.map((points, i) => (
          <polyline
            key={i}
            points={points}
            fill="none"
            stroke="#456d40"
            strokeWidth="2.1"
            strokeLinejoin="round"
          />
        ))}
        {rows.length <= 60 &&
          rows.map(
            (d, i) =>
              d.T2M !== null && (
                <circle
                  key={d.date}
                  cx={x(i)}
                  cy={tempY(d.T2M)}
                  r="2.4"
                  fill="#fff"
                  stroke="#456d40"
                  strokeWidth="1.4"
                />
              ),
          )}
      </svg>
    </>
  );
}
export function SourceMeta({ climate }) {
  if (!climate) return null;
  return (
    <div className="source-meta">
      <span className="source-pill">NASA POWER</span>
      <span>
        {dayLabel(climate.start_date)} — {dayLabel(climate.end_date)}
      </span>
      <span>
        Consultado: {dayLabel(climate.fetched_at)} ·{" "}
        {climate.cached ? "Copia guardada" : "Consulta real"}
        {climate.stale ? " · Sin actualizar" : ""}
      </span>
      <a href={climate.source_url} target="_blank" rel="noreferrer">
        Ver consulta original <ExternalLink size={12} />
      </a>
    </div>
  );
}
export default function Environment({ parcel, period, onAnalyze, busy }) {
  const [dates, setDates] = useState(
    period || { start_date: "", end_date: "" },
  );
  const c = parcel?.climate;
  return (
    <>
      <div className="page-intro">
        <p className="eyebrow">CLIMA CON FUENTE Y FECHA</p>
        <h1>Entender el clima también es cultivar.</h1>
        <p>
          Consultá un período pasado. Los datos meteorológicos de NASA ayudan a
          describir el contexto de tu parcela; no son un pronóstico.
        </p>
      </div>
      <section className="card section-pad">
        <div className="card-heading">
          <div>
            <h2>Elegí el período que querés conocer</h2>
            <p>
              Entre 1 y 366 días. Puede haber demora en la disponibilidad de
              NASA.
            </p>
          </div>
          <CalendarDays size={19} />
        </div>
        <form
          className="period-form"
          onSubmit={(e) => {
            e.preventDefault();
            onAnalyze(dates, true);
          }}
        >
          <label className="field">
            Desde
            <input
              required
              type="date"
              min="1981-01-01"
              value={dates.start_date}
              onChange={(e) =>
                setDates((d) => ({ ...d, start_date: e.target.value }))
              }
            />
          </label>
          <label className="field">
            Hasta
            <input
              required
              type="date"
              min={dates.start_date}
              value={dates.end_date}
              onChange={(e) =>
                setDates((d) => ({ ...d, end_date: e.target.value }))
              }
            />
          </label>
          <button disabled={busy} className="button button-green">
            {busy ? <LoaderCircle className="spin" /> : <RefreshCw />}
            {busy ? "Consultando NASA…" : "Consultar NASA POWER"}
          </button>
        </form>
      </section>
      <section className="card section-pad mt-5">
        <div className="card-heading">
          <div>
            <h2>El período, en perspectiva</h2>
            <p>
              {parcel?.name || "Seleccioná una parcela"} · temperatura del aire
              y precipitación
            </p>
          </div>
        </div>
        <ClimateChart climate={c} />
        <SourceMeta climate={c} />
      </section>
      {c && (
        <>
          <div className="info-banner mt-5">
            <Info />
            <p>
              <strong>
                Estimaciones meteorológicas NASA · resúmenes calculados.
              </strong>{" "}
              No son mediciones tomadas en tu terreno. La humedad relativa
              corresponde al aire, no al suelo. No hay datos simulados.
            </p>
          </div>
          {c.warnings.length > 0 && (
            <div className="warning mt-5">
              <strong>Avisos de calidad y disponibilidad</strong>
              <ul>
                {c.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="card section-pad mt-5">
            <h2 className="mb-3">Datos diarios y disponibilidad</h2>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Fecha (LST)</th>
                    <th>Media °C</th>
                    <th>Lluvia mm/día</th>
                    <th>Humedad %</th>
                    <th>Máxima °C</th>
                    <th>Mínima °C</th>
                  </tr>
                </thead>
                <tbody>
                  {c.daily.map((d) => (
                    <tr key={d.date}>
                      <td>{dayLabel(d.date)}</td>
                      <td>{number(d.T2M)}</td>
                      <td>{number(d.PRECTOTCORR)}</td>
                      <td>{number(d.RH2M)}</td>
                      <td>{number(d.T2M_MAX)}</td>
                      <td>{number(d.T2M_MIN)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="small muted mt-3">
              — significa dato no disponible. Los faltantes no se convierten en
              cero ni se interpolan.
            </p>
          </div>
        </>
      )}
    </>
  );
}
