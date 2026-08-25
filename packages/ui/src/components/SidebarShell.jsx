import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";

const COLLAPSE_STORAGE_KEY = "ingefact-sidebar-collapsed";

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
  const [openMenus, setOpenMenus] = useState({});
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(COLLAPSE_STORAGE_KEY) === "true",
  );

  useEffect(() => {
    localStorage.setItem(COLLAPSE_STORAGE_KEY, String(collapsed));
  }, [collapsed]);

  const isActive = (path) => location.pathname.startsWith(path);

  const toggleMenu = (path) => {
    setOpenMenus((prev) => ({ ...prev, [path]: !prev[path] }));
  };

  const handleParentClick = (item) => {
    if (collapsed) {
      // Al expandir desde el modo colapsado, de una vez abre el submenú
      // en el que hizo clic en vez de dejarlo cerrado.
      setCollapsed(false);
      setOpenMenus((prev) => ({ ...prev, [item.path]: true }));
      return;
    }
    toggleMenu(item.path);
  };

  return (
    <aside
      className={`${collapsed ? "w-20" : "w-64"} bg-neutralCustom-800 text-white flex flex-col justify-between ${collapsed ? "px-2 py-6" : "p-6"} shrink-0 h-screen overflow-y-auto transition-all duration-200`}
    >
      <div>
        <div
          className={`flex ${collapsed ? "justify-center" : "justify-end"} mb-2`}
        >
          <button
            type="button"
            onClick={() => setCollapsed((prev) => !prev)}
            aria-label={collapsed ? "Expandir menú" : "Contraer menú"}
            title={collapsed ? "Expandir menú" : "Contraer menú"}
            className="w-6 h-6 flex items-center justify-center rounded-full bg-neutralCustom-600 hover:bg-brand-600 text-white transition-colors shrink-0"
          >
            <svg
              className={`w-3.5 h-3.5 transition-transform ${collapsed ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
        </div>

        <div className="mb-8 flex flex-col items-center text-center w-full">
          <img
            src={logo}
            alt={`Logo ${brandName}`}
            className="h-14 w-auto object-contain mb-3 mx-auto"
          />
          {!collapsed && (
            <>
              <h1 className="text-2xl font-bold text-brand-400 tracking-tight">
                {brandName}
              </h1>
              <p
                className="text-sm text-white mt-1 font-medium truncate w-full"
                title={headerLabel}
              >
                {headerLabel}
              </p>
            </>
          )}
        </div>

        <nav className="space-y-2">
          {navItems.map((item) => {
            const hasChildren = Array.isArray(item.children) && item.children.length > 0;

            if (!hasChildren) {
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  title={collapsed ? item.name : undefined}
                  className={`flex items-center rounded-brand-md text-sm font-medium transition-colors ${
                    collapsed ? "justify-center px-2 py-2.5" : "px-4 py-2.5"
                  } ${
                    isActive(item.path)
                      ? "bg-brand-600 text-white"
                      : "text-neutralCustom-500 hover:bg-neutralCustom-50/10 hover:text-white"
                  }`}
                >
                  <svg
                    className={`w-5 h-5 shrink-0 ${collapsed ? "" : "mr-3"}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    {item.icon}
                  </svg>
                  {!collapsed && item.name}
                </Link>
              );
            }

            const childActive = item.children.some((child) =>
              isActive(child.path),
            );
            const isOpen = !collapsed && (openMenus[item.path] ?? childActive);

            return (
              <div key={item.path}>
                <button
                  type="button"
                  title={collapsed ? item.name : undefined}
                  onClick={() => handleParentClick(item)}
                  className={`w-full flex items-center rounded-brand-md text-sm font-medium transition-colors ${
                    collapsed ? "justify-center px-2 py-2.5" : "justify-between px-4 py-2.5"
                  } ${
                    childActive
                      ? "bg-brand-600 text-white"
                      : "text-neutralCustom-500 hover:bg-neutralCustom-50/10 hover:text-white"
                  }`}
                >
                  <span className="flex items-center">
                    <svg
                      className={`w-5 h-5 shrink-0 ${collapsed ? "" : "mr-3"}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      {item.icon}
                    </svg>
                    {!collapsed && item.name}
                  </span>
                  {!collapsed && (
                    <svg
                      className={`w-4 h-4 transition-transform ${isOpen ? "rotate-90" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  )}
                </button>
                {isOpen && (
                  <div className="mt-1 ml-8 space-y-1">
                    {item.children.map((child) => (
                      <Link
                        key={child.path}
                        to={child.path}
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
        {!collapsed && (
          <div className="mb-4">
            <p
              className="text-xs text-neutralCustom-500 truncate w-full"
              title={footerLabel}
            >
              {footerLabel}
            </p>
            <span className="inline-block mt-1 text-[10px] font-bold text-brand-400 bg-brand-50/10 px-2 py-0.5 rounded-brand-md uppercase">
              {roleBadge}
            </span>
          </div>
        )}
        <button
          onClick={onLogout}
          title={collapsed ? "Cerrar sesión" : undefined}
          className="w-full flex items-center justify-center px-4 py-2 bg-fiscal-danger/10 hover:bg-fiscal-danger text-fiscal-danger hover:text-white rounded-brand-md text-sm font-medium transition-all"
        >
          {collapsed ? (
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
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
  );
}
