import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css"; // <-- ESTA LÍNEA ES OBLIGATORIA
import { preventNumberWheelChange } from "@ingefact/ui";

preventNumberWheelChange();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
