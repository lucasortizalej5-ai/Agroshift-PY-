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

function saveReport(parcel) {
  const r = parcel.recommendation,
    c = parcel.climate;
  const lines = [
    "AgroShift PY · Opciones iniciales de rotación",
    "",
    `Parcela: ${parcel.name}`,
    `Ubicación: ${parcel.latitude}, ${parcel.longitude}`,
    `Cultivo anterior: ${r.previous_crop?.name || "Sin registro"}`,
    `Reglas: ${r.rule_version}`,
    "",
    r.message,
    "",
    ...r.candidates.flatMap((x) => [
      x.name + " · " + x.family,
      x.reason,
      ...x.requires.map((y) => "• " + y),
      "",
    ]),
    "Limitaciones:",
    ...r.warnings.map((x) => "• " + x),
    "",
    c
      ? `NASA POWER: ${c.start_date} a ${c.end_date}. Consultado: ${c.fetched_at}`
      : "Sin consulta NASA.",
    c?.source_url || "",
    ...r.sources.map((s) => s.label + ": " + s.url),
  ];
  const url = URL.createObjectURL(
    new Blob(["\ufeff" + lines.join("\n")], {
      type: "text/plain;charset=utf-8",
    }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "AgroShift-rotacion.txt";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function Rotation({ parcel, onEdit }) {
  const r = parcel?.recommendation;
  return (
    <>
      <div className="page-intro">
        <p className="eyebrow">DIVERSIFICAR CON UNA EXPLICACIÓN</p>
        <h1>Un nuevo ciclo para tu tierra.</h1>
        <p>
          El cultivo anterior aporta una primera regla: explorar otra familia
          botánica. Estas opciones necesitan revisión del calendario, el suelo y
          el manejo local.
        </p>
      </div>
      {!parcel ? (
        <div className="empty-state">
          <Leaf />
          <h2>Primero, conozcamos tu parcela.</h2>
          <p>Registrá su ubicación y el cultivo anterior para comenzar.</p>
          <button className="button button-green" onClick={() => onEdit()}>
            Registrar parcela
            <ArrowRight />
          </button>
        </div>
      ) : (
        <>
          <div className="rotation-context">
            <div>
              <span className="small muted">
                CULTIVO ANTERIOR · INFORMADO POR EL PRODUCTOR
              </span>
              <h2>
                {r.previous_crop?.name || "Sin registro"}{" "}
                <span>{r.previous_crop?.family || ""}</span>
              </h2>
            </div>
            <button
              className="button button-white"
              onClick={() => onEdit(parcel)}
            >
              Editar historial
            </button>
          </div>
          {r.status === "needs_history" ? (
            <div className="warning mt-5">
              <AlertCircle />
              <p>{r.message}</p>
            </div>
          ) : (
            <>
              <div className="section-heading mt-6">
                <div>
                  <h2>Opciones iniciales para evaluar</h2>
                  <p>
                    Mismo nivel de prioridad. No ordenadas por rendimiento o
                    rentabilidad.
                  </p>
                </div>
                <button
                  className="button button-white"
                  onClick={() => saveReport(parcel)}
                >
                  <Download />
                  Descargar
                </button>
              </div>
              <div className="candidate-grid">
                {r.candidates.map((c, i) => (
                  <article className="card candidate" key={c.id}>
                    <div className="candidate-top">
                      <span>OPCIÓN {String(i + 1).padStart(2, "0")}</span>
                      <span className="soft-pill">{c.group}</span>
                    </div>
                    <div className={"plant-symbol plant-" + c.id}>
                      <Leaf />
                    </div>
                    <h2>{c.name}</h2>
                    <p className="scientific">
                      {c.scientific_name} · {c.family}
                    </p>
                    <div className="reason">
                      <Check size={15} />
                      <p>{c.reason}</p>
                    </div>
                    <h3>Antes de elegir</h3>
                    <ul>
                      {c.requires.map((x) => (
                        <li key={x}>{x}</li>
                      ))}
                    </ul>
                    <p className="rule-ref">
                      Reglas aplicadas: {c.rule_ids.join(" · ")}
                    </p>
                  </article>
                ))}
              </div>
              <section className="card section-pad mt-5">
                <div className="card-heading">
                  <div>
                    <h2>Opciones que este filtro no prioriza</h2>
                    <p>
                      La exclusión corresponde a la regla de diversificación, no
                      a una prohibición agronómica universal.
                    </p>
                  </div>
                </div>
                <div className="excluded-list">
                  {r.excluded.map((c) => (
                    <p key={c.id}>
                      <strong>{c.name}</strong>
                      <span>{c.reason}</span>
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
              <strong>Qué falta verificar</strong>
              <ul>
                {r.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          </div>
          <section className="card section-pad mt-5">
            <div className="card-heading">
              <div>
                <h2>Una regla que podés revisar</h2>
                <p>
                  Motor {r.rule_version}. No usa un modelo de inteligencia
                  artificial ni un puntaje de aptitud.
                </p>
              </div>
              <BookOpen size={19} />
            </div>
            <div className="rule-list">
              {r.rules.map((rule) => (
                <p key={rule.id}>
                  <code>{rule.id}</code>
                  <span>{rule.text}</span>
                </p>
              ))}
            </div>
            <div className="source-links">
              {r.sources.map((s) => (
                <a key={s.url} href={s.url} target="_blank" rel="noreferrer">
                  {s.label}
                  <ExternalLink size={12} />
                </a>
              ))}
            </div>
          </section>
          <SourceMeta climate={parcel.climate} />
        </>
      )}
    </>
  );
}
