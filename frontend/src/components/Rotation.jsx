import React from "react";
import {
  Leaf,
  ArrowRight,
  Info,
  Download,
  Check,
  BookOpen,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { SourceMeta } from "./Environment.jsx";
import {
  translations,
  translateCropName,
  translateCropGroup,
  translateReason,
  translateRequirement,
  translateWarning,
  translateRule,
} from "../i18n.js";

function saveReport(parcel, lang = "en") {
  const t = (k) => translations[lang]?.[k] || translations.es[k] || k;
  const r = parcel.recommendation,
    c = parcel.climate;

  const prevName =
    translateCropName(r.previous_crop?.name, lang) || t("no_record");
  const lines = [
    lang === "en"
      ? "AgroShift PY · Initial crop rotation options"
      : "AgroShift PY · Opciones iniciales de rotación",
    "",
    `${lang === "en" ? "Parcel" : "Parcela"}: ${parcel.name}`,
    `${lang === "en" ? "Location" : "Ubicación"}: ${parcel.latitude}, ${parcel.longitude}`,
    `${lang === "en" ? "Previous crop" : "Cultivo anterior"}: ${prevName}`,
    `${lang === "en" ? "Rules engine" : "Reglas"}: ${r.rule_version}`,
    "",
    lang === "en" && r.status === "needs_history"
      ? "Register the previous crop to apply rotation rules without fabricating history."
      : r.message,
    "",
    ...r.candidates.flatMap((x) => [
      `${translateCropName(x.name, lang)} · ${x.family}`,
      translateReason(x.reason, lang),
      ...x.requires.map((y) => "• " + translateRequirement(y, lang)),
      "",
    ]),
    lang === "en" ? "Limitations & verification:" : "Limitaciones:",
    ...r.warnings.map((x) => "• " + translateWarning(x, lang)),
    "",
    c
      ? `NASA POWER: ${c.start_date} - ${c.end_date}. ${t("source_queried_prefix")}: ${c.fetched_at}`
      : lang === "en"
        ? "No NASA query."
        : "Sin consulta NASA.",
    c?.source_url || "",
    ...r.sources.map((s) => s.label + ": " + s.url),
  ];

  const blob = new Blob(["\ufeff" + lines.join("\n")], {
    type: "text/plain;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download =
    lang === "en" ? "AgroShift-rotation.txt" : "AgroShift-rotacion.txt";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function Rotation({ parcel, onEdit, lang = "en" }) {
  const t = (k) => translations[lang]?.[k] || translations.es[k] || k;
  const r = parcel?.recommendation;

  return (
    <>
      <div className="page-intro">
        <p className="eyebrow">{t("rotation_eyebrow")}</p>
        <h1>{t("rotation_title")}</h1>
        <p>{t("rotation_desc")}</p>
      </div>
      {!parcel ? (
        <div className="empty-state">
          <Leaf />
          <h2>{t("rotation_empty_title")}</h2>
          <p>{t("rotation_empty_desc")}</p>
          <button className="button button-green" onClick={() => onEdit()}>
            {t("rotation_empty_btn")}
            <ArrowRight />
          </button>
        </div>
      ) : (
        <>
          <div className="rotation-context">
            <div>
              <span className="small muted">{t("prev_crop_eyebrow")}</span>
              <h2>
                {translateCropName(r?.previous_crop?.name, lang) ||
                  t("no_record")}{" "}
                <span>{r?.previous_crop?.family || ""}</span>
              </h2>
            </div>
            <button
              className="button button-white"
              onClick={() => onEdit(parcel)}
            >
              {t("edit_history_btn")}
            </button>
          </div>
          {r?.status === "needs_history" ? (
            <div className="warning mt-5">
              <AlertCircle />
              <p>
                {lang === "en"
                  ? "Register the previous crop to apply rotation rules without fabricating history."
                  : r.message}
              </p>
            </div>
          ) : (
            <>
              <div className="section-heading mt-6">
                <div>
                  <h2>{t("initial_options_title")}</h2>
                  <p>{t("initial_options_desc")}</p>
                </div>
                <button
                  className="button button-white"
                  onClick={() => saveReport(parcel, lang)}
                >
                  <Download />
                  {t("download_btn")}
                </button>
              </div>
              <div className="candidate-grid">
                {r?.candidates.map((c, i) => (
                  <article className="card candidate" key={c.id}>
                    <div className="candidate-top">
                      <span>
                        {t("option_label")} {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="soft-pill">
                        {translateCropGroup(c.group, lang)}
                      </span>
                    </div>
                    <div className={"plant-symbol plant-" + c.id}>
                      <Leaf />
                    </div>
                    <h2>{translateCropName(c.name, lang)}</h2>
                    <p className="scientific">
                      {c.scientific_name} · {c.family}
                    </p>
                    <div className="reason">
                      <Check size={15} />
                      <p>{translateReason(c.reason, lang)}</p>
                    </div>
                    <h3>{t("before_choosing")}</h3>
                    <ul>
                      {c.requires.map((x) => (
                        <li key={x}>{translateRequirement(x, lang)}</li>
                      ))}
                    </ul>
                    <p className="rule-ref">
                      {t("rules_applied")}: {c.rule_ids.join(" · ")}
                    </p>
                  </article>
                ))}
              </div>
              <section className="card section-pad mt-5">
                <div className="card-heading">
                  <div>
                    <h2>{t("excluded_title")}</h2>
                    <p>{t("excluded_desc")}</p>
                  </div>
                </div>
                <div className="excluded-list">
                  {r?.excluded.map((c) => (
                    <p key={c.id}>
                      <strong>{translateCropName(c.name, lang)}</strong>
                      <span>{translateReason(c.reason, lang)}</span>
                      <code>{c.rule_id}</code>
                    </p>
                  ))}
                </div>
              </section>
            </>
          )}
          <div className="warning mt-5">
            <Info />
            <div>
              <strong>{t("what_remains")}</strong>
              <ul>
                {r?.warnings.map((w, i) => (
                  <li key={i}>{translateWarning(w, lang)}</li>
                ))}
              </ul>
            </div>
          </div>
          <section className="card section-pad mt-5">
            <div className="card-heading">
              <div>
                <h2>{t("reviewable_rule_title")}</h2>
                <p>
                  {t("reviewable_rule_desc").replace(
                    "{version}",
                    r?.rule_version || "1.0",
                  )}
                </p>
              </div>
              <BookOpen size={19} />
            </div>
            <div className="rule-list">
              {r?.rules.map((rule) => {
                const tr = translateRule(rule, lang);
                return (
                  <p key={rule.id}>
                    <code>{rule.id}</code>
                    <span>{tr.text}</span>
                  </p>
                );
              })}
            </div>
            <div className="source-links">
              {r?.sources.map((s) => (
                <a key={s.url} href={s.url} target="_blank" rel="noreferrer">
                  {s.label}
                  <ExternalLink size={12} />
                </a>
              ))}
            </div>
          </section>
          <SourceMeta climate={parcel.climate} lang={lang} />
        </>
      )}
    </>
  );
}
