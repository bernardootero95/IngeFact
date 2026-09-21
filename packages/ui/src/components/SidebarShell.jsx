import { useState, useEffect, useId, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import useMediaQuery from "../hooks/useMediaQuery.js";

const COLLAPSE_STORAGE_KEY = "ingefact-sidebar-collapsed";
// Desde este ancho el menu es una columna fija; por debajo es un drawer.
const DESKTOP_QUERY = "(min-width: 768px)";

/**
 * Menu lateral. En escritorio (>= 768px) es una columna que se puede contraer a
 * solo iconos. En pantallas pequenas se convierte en un drawer: una barra
 * superior con el boton de menu, un panel deslizable con fondo oscuro, cierre
 * con Escape / clic afuera / al navegar, y el foco vuelve al boton de menu.
 */
export default function SidebarShell({
  logo,
  brandName = "IngeFact",
  headerLabel,
  navItems,
  footerLabel,
  roleBadge,
  onLogout,
}) {
  const location = useLocation();
  const drawerId = useId();
  const menuButtonRef = useRef(null);
  const closeButtonRef = useRef(null);
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const [openMenus, setOpenMenus] = useState({});
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(COLLAPSE_STORAGE_KEY) === "true",
  );

  // Contraer solo aplica en escritorio; el drawer siempre se muestra completo.
  const compact = collapsed && isDesktop;
  const drawerOpen = mobileOpen && !isDesktop;
  const closeDrawer = () => setMobileOpen(false);

  useEffect(() => {
    localStorage.setItem(COLLAPSE_STORAGE_KEY, String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    if (!drawerOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);
    // El panel arranca con visibility:hidden (no enfocable) y pasa a visible al iniciar
    // la transicion, asi que el foco se mueve un instante despues.
    const focusTimer = setTimeout(() => closeButtonRef.current?.focus(), 50);
    const menuButton = menuButtonRef.current;
    return () => {
      clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
      menuButton?.focus();
    };
  }, [drawerOpen]);

  const isActive = (path) => location.pathname.startsWith(path);

  const toggleMenu = (path) => {
    setOpenMenus((prev) => ({ ...prev, [path]: !prev[path] }));
  };

  const handleParentClick = (item) => {
    if (compact) {
      // Al expandir desde el modo colapsado, de una vez abre el submenú
      // en el que hizo clic en vez de dejarlo cerrado.
      setCollapsed(false);
      setOpenMenus((prev) => ({ ...prev, [item.path]: true }));
      return;
    }
    toggleMenu(item.path);
  };

  const handleLogout = () => {
    closeDrawer();
    onLogout();
  };

  const asideClasses = [
    "bg-neutralCustom-800 text-white flex flex-col justify-between shrink-0 overflow-y-auto",
    // Movil: panel fuera de pantalla que entra desde la izquierda.
    "fixed inset-y-0 left-0 z-40 w-64 max-w-[85vw] transition-[transform,visibility] duration-200",
    drawerOpen ? "translate-x-0 visible" : "-translate-x-full invisible",
    // Escritorio: columna fija a la altura de la pantalla.
    "md:static md:z-auto md:h-screen md:max-w-none md:translate-x-0 md:visible md:transition-all",
    compact ? "md:w-20 px-2 py-6" : "md:w-64 p-6",
  ].join(" ");

  return (
    <>
      <div className="md:hidden sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 bg-neutralCustom-800 px-2 text-white">
        <button
          ref={menuButtonRef}
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menú"
          aria-expanded={drawerOpen}
          aria-controls={drawerId}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-brand-md hover:bg-neutralCustom-50/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
        <img src={logo} alt="" className="h-8 w-auto shrink-0 object-contain" />
        <span className="truncate text-sm font-medium" title={headerLabel}>
          {headerLabel || brandName}
        </span>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 md:hidden" aria-hidden="true" onClick={closeDrawer} />
      )}

      <aside id={drawerId} aria-label="Menú principal" className={asideClasses}>
        <div>
          <div className={`flex ${compact ? "justify-center" : "justify-end"} mb-2`}>
            <button
              type="button"
              onClick={() => setCollapsed((prev) => !prev)}
              aria-label={compact ? "Expandir menú" : "Contraer menú"}
              title={compact ? "Expandir menú" : "Contraer menú"}
              className="hidden md:flex w-8 h-8 items-center justify-center rounded-full bg-neutralCustom-600 hover:bg-brand-600 text-white transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
            >
              <svg
                className={`w-3.5 h-3.5 transition-transform ${compact ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={closeDrawer}
              aria-label="Cerrar menú"
              className="md:hidden flex h-11 w-11 items-center justify-center rounded-brand-md hover:bg-neutralCustom-50/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mb-8 flex flex-col items-center text-center w-full">
            <img
              src={logo}
              alt={`Logo ${brandName}`}
              className="h-14 w-auto object-contain mb-3 mx-auto"
            />
            {!compact && (
              <>
                <h1 className="text-2xl font-bold text-brand-400 tracking-tight">{brandName}</h1>
                <p className="text-sm text-white mt-1 font-medium truncate w-full" title={headerLabel}>
                  {headerLabel}
                </p>
              </>
            )}
          </div>

          <nav aria-label="Navegación principal" className="space-y-2">
            {navItems.map((item) => {
              const hasChildren = Array.isArray(item.children) && item.children.length > 0;

              if (!hasChildren) {
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={closeDrawer}
                    title={compact ? item.name : undefined}
                    className={`flex items-center rounded-brand-md text-sm font-medium transition-colors ${
                      compact ? "justify-center px-2 py-2.5" : "px-4 py-2.5"
                    } ${
                      isActive(item.path)
                        ? "bg-brand-600 text-white"
                        : "text-neutralCustom-500 hover:bg-neutralCustom-50/10 hover:text-white"
                    }`}
                  >
                    <svg
                      className={`w-5 h-5 shrink-0 ${compact ? "" : "mr-3"}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      {item.icon}
                    </svg>
                    {!compact && item.name}
                  </Link>
                );
              }

              const childActive = item.children.some((child) => isActive(child.path));
              const isOpen = !compact && (openMenus[item.path] ?? childActive);

              return (
                <div key={item.path}>
                  <button
                    type="button"
                    title={compact ? item.name : undefined}
                    aria-expanded={isOpen}
                    onClick={() => handleParentClick(item)}
                    className={`w-full flex items-center rounded-brand-md text-sm font-medium transition-colors ${
                      compact ? "justify-center px-2 py-2.5" : "justify-between px-4 py-2.5"
                    } ${
                      childActive
                        ? "bg-brand-600 text-white"
                        : "text-neutralCustom-500 hover:bg-neutralCustom-50/10 hover:text-white"
                    }`}
                  >
                    <span className="flex items-center">
                      <svg
                        className={`w-5 h-5 shrink-0 ${compact ? "" : "mr-3"}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        {item.icon}
                      </svg>
                      {!compact && item.name}
                    </span>
                    {!compact && (
                      <svg
                        className={`w-4 h-4 transition-transform ${isOpen ? "rotate-90" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </button>
                  {isOpen && (
                    <div className="mt-1 ml-8 space-y-1">
                      {item.children.map((child) => (
                        <Link
                          key={child.path}
                          to={child.path}
                          onClick={closeDrawer}
                          className={`block px-4 py-2 rounded-brand-md text-sm font-medium transition-colors ${
                            isActive(child.path)
                              ? "bg-brand-600 text-white"
                              : "text-neutralCustom-500 hover:bg-neutralCustom-50/10 hover:text-white"
                          }`}
                        >
                          {child.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-neutralCustom-500/20 pt-4 text-center mt-8">
          {!compact && (
            <div className="mb-4">
              <p className="text-xs text-neutralCustom-500 truncate w-full" title={footerLabel}>
                {footerLabel}
              </p>
              <span className="inline-block mt-1 text-xs font-bold text-brand-400 bg-brand-50/10 px-2 py-0.5 rounded-brand-md uppercase">
                {roleBadge}
              </span>
            </div>
          )}
          <button
            onClick={handleLogout}
            title={compact ? "Cerrar sesión" : undefined}
            aria-label="Cerrar sesión"
            className="w-full flex items-center justify-center px-4 py-2 bg-fiscal-danger/10 hover:bg-fiscal-danger text-fiscal-danger hover:text-white rounded-brand-md text-sm font-medium transition-all"
          >
            {compact ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            ) : (
              "Cerrar sesión"
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
