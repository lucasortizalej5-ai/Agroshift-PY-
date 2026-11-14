import React from "react";
import { hydrateRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";

const initialState = JSON.parse(
  document.getElementById("initial-state").textContent,
);
hydrateRoot(
  document.getElementById("root"),
  <App initialState={initialState} />,
);
