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
import { translations, translateWarning } from "../i18n.js";

export function ClimateChart({ climate, lang = "en" }) {
  const t = (k) => translations[lang]?.[k] || translations.es[k] || k;

  if (!climate)
    return (
      <div className="chart-empty">
        <CloudRain />
        <p>{t("climate_empty_1")}</p>
        <span>{t("climate_empty_2")}</span>
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
          {t("daily_rain_legend")}
        </span>
        <span>
          <i className="line" />
          {t("mean_temp_legend")}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="climate-chart"
        role="img"
        aria-label={`${t("mean_temp_legend")} & ${t("daily_rain_legend")}: ${dayLabel(climate.start_date, lang)} - ${dayLabel(climate.end_date, lang)}`}
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
              {number(maxRain * v, 0, lang)}
            </text>
            <text
              className="chart-label"
              x={w - right + 8}
              y={top + ch - v * ch + 3}
            >
              {number(minTemp + (maxTemp - minTemp) * v, 0, lang)}°
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
                  {d.date}: {number(d.PRECTOTCORR, 1, lang)}{" "}
                  {lang === "en" ? "mm/day" : "mm/día"};{" "}
                  {number(d.T2M, 1, lang)} °C
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
        {segments.map((pts, i) => (
          <polyline
            key={i}
            points={pts}
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

export function SourceMeta({ climate, lang = "en" }) {
  if (!climate) return null;
  const t = (k) => translations[lang]?.[k] || translations.es[k] || k;

  return (
    <div className="source-meta">
      <span className="source-pill">NASA POWER</span>
      <span>
        {dayLabel(climate.start_date, lang)} —{" "}
        {dayLabel(climate.end_date, lang)}
      </span>
      <span>
        {t("source_queried_prefix")}: {dayLabel(climate.fetched_at, lang)} ·{" "}
        {climate.cached ? t("cached_copy") : t("live_query")}
        {climate.stale ? ` · ${t("not_updated")}` : ""}
      </span>
      <a href={climate.source_url} target="_blank" rel="noreferrer">
        {t("view_original_query")} <ExternalLink size={12} />
      </a>
    </div>
  );
}

export default function Environment({
  parcel,
  period,
  onAnalyze,
  busy,
  lang = "en",
}) {
  const t = (k) => translations[lang]?.[k] || translations.es[k] || k;
  const [dates, setDates] = useState(
    period || { start_date: "", end_date: "" },
  );
  const c = parcel?.climate;

  return (
    <>
      <div className="page-intro">
        <p className="eyebrow">{t("climate_eyebrow")}</p>
        <h1>{t("climate_title")}</h1>
        <p>{t("climate_desc")}</p>
      </div>
      <section className="card section-pad">
        <div className="card-heading">
          <div>
            <h2>{t("choose_period_title")}</h2>
            <p>{t("choose_period_desc")}</p>
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
            {t("from_date")}
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
            {t("to_date")}
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
            {busy ? t("querying_nasa") : t("query_nasa_btn")}
          </button>
        </form>
      </section>
      <section className="card section-pad mt-5">
        <div className="card-heading">
          <div>
            <h2>{t("period_in_perspective")}</h2>
            <p>
              {parcel?.name || t("select_a_parcel")} · {t("air_temp_and_rain")}
            </p>
          </div>
        </div>
        <ClimateChart climate={c} lang={lang} />
        <SourceMeta climate={c} lang={lang} />
      </section>
      {c && (
        <>
          <div className="info-banner mt-5">
            <Info />
            <p>
              <strong>{t("nasa_banner_title")}</strong> {t("nasa_banner_desc")}
            </p>
          </div>
          {c.warnings.length > 0 && (
            <div className="warning mt-5">
              <strong>{t("quality_notices")}</strong>
              <ul>
                {c.warnings.map((w, i) => (
                  <li key={i}>{translateWarning(w, lang)}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="card section-pad mt-5">
            <h2 className="mb-3">{t("daily_data_title")}</h2>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>{t("col_date")}</th>
                    <th>{t("col_mean_temp")}</th>
                    <th>{t("col_rain")}</th>
                    <th>{t("col_humidity")}</th>
                    <th>{t("col_max_temp")}</th>
                    <th>{t("col_min_temp")}</th>
                  </tr>
                </thead>
                <tbody>
                  {c.daily.map((d) => (
                    <tr key={d.date}>
                      <td>{dayLabel(d.date, lang)}</td>
                      <td>{number(d.T2M, 1, lang)}</td>
                      <td>{number(d.PRECTOTCORR, 1, lang)}</td>
                      <td>{number(d.RH2M, 1, lang)}</td>
                      <td>{number(d.T2M_MAX, 1, lang)}</td>
                      <td>{number(d.T2M_MIN, 1, lang)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="small muted mt-3">{t("table_note")}</p>
          </div>
        </>
      )}
    </>
  );
}
