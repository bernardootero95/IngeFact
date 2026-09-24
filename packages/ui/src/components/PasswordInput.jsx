import { useState } from "react";
import { fieldA11y } from "./FormFeedback.jsx";

/**
 * Campo de contrasena con boton para mostrar/ocultar. El boton es accesible
 * por teclado y anuncia su estado (aria-pressed).
 */
export default function PasswordInput({ id, value, onChange, error, autoComplete, placeholder = "••••••••" }) {
  const [visible, setVisible] = useState(false);
  const label = visible ? "Ocultar contraseña" : "Mostrar contraseña";

  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        id={id}
        required
        autoComplete={autoComplete}
        value={value}
        onChange={onChange}
        className={`field field-lg w-full pl-4 pr-11 ${
          error ? "border-fiscal-danger field-invalid focus:border-fiscal-danger" : ""
        }`}
        placeholder={placeholder}
        {...fieldA11y(id, error)}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={label}
        aria-pressed={visible}
        title={label}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-brand-md text-neutralCustom-500 hover:text-brand-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          {visible ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
            />
          ) : (
            <>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </>
          )}
        </svg>
      </button>
    </div>
  );
}
