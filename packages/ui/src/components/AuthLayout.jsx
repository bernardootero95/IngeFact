import { LEGAL_LINKS } from "../legal.js";

/**
 * Tarjeta centrada comun a las pantallas de acceso (login, recuperar y
 * restablecer contrasena, cambio de clave temporal, aceptacion de terminos).
 * Incluye en el pie los enlaces a los textos legales vigentes.
 */
export default function AuthLayout({ logo, subtitle, children }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-neutralCustom-50 font-sans p-4">
      <main className="w-full max-w-md bg-white border border-neutralCustom-100 rounded-brand-lg p-8 shadow-sm">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img src={logo} alt="" className="h-24 w-auto object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-brand-600 tracking-tight">IngeFact</h1>
          {subtitle && <p className="text-sm text-neutralCustom-500 mt-2 font-normal">{subtitle}</p>}
        </div>
        {children}
      </main>

      <footer>
        <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-neutralCustom-500">
          {LEGAL_LINKS.map((link) => (
            <li key={link.href}>
              <a href={link.href} target="_blank" rel="noopener noreferrer" className="underline hover:text-brand-700">
                {link.label}
                <span className="sr-only"> (se abre en una pestaña nueva)</span>
              </a>
            </li>
          ))}
        </ul>
      </footer>
    </div>
  );
}
