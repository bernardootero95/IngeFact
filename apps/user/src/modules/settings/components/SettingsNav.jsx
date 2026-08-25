import { NavLink } from "react-router-dom";

// Secciones de "Configuración de Empresa". Se irán agregando más opciones
// aquí (ej. resolución DIAN) sin tocar el resto del módulo.
const SETTINGS_SECTIONS = [{ name: "Impuestos", path: "/settings/taxes" }];

export default function SettingsNav() {
  return (
    <aside className="w-56 bg-white border-r border-neutralCustom-100 shrink-0 h-screen overflow-y-auto">
      <div className="px-4 py-5">
        <h3 className="text-xs font-semibold text-neutralCustom-400 uppercase tracking-wide px-2 mb-2">
          Configuración
        </h3>
        <nav className="space-y-1">
          {SETTINGS_SECTIONS.map((section) => (
            <NavLink
              key={section.path}
              to={section.path}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-brand-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-brand-50 text-brand-600"
                    : "text-neutralCustom-600 hover:bg-neutralCustom-50"
                }`
              }
            >
              {section.name}
            </NavLink>
          ))}
        </nav>
      </div>
    </aside>
  );
}
