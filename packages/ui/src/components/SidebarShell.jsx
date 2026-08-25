import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

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

  const isActive = (path) => location.pathname.startsWith(path);

  const toggleMenu = (path) => {
    setOpenMenus((prev) => ({ ...prev, [path]: !prev[path] }));
  };

  return (
    <aside className="w-64 bg-neutralCustom-800 text-white flex flex-col justify-between p-6 shrink-0 h-screen overflow-y-auto">
      <div>
        <div className="mb-8 flex flex-col items-center text-center w-full">
          <img
            src={logo}
            alt={`Logo ${brandName}`}
            className="h-14 w-auto object-contain mb-3 mx-auto"
          />
          <h1 className="text-2xl font-bold text-brand-400 tracking-tight">
            {brandName}
          </h1>
          <p
            className="text-sm text-white mt-1 font-medium truncate w-full"
            title={headerLabel}
          >
            {headerLabel}
          </p>
        </div>

        <nav className="space-y-2">
          {navItems.map((item) => {
            const hasChildren = Array.isArray(item.children) && item.children.length > 0;

            if (!hasChildren) {
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center px-4 py-2.5 rounded-brand-md text-sm font-medium transition-colors ${
                    isActive(item.path)
                      ? "bg-brand-600 text-white"
                      : "text-neutralCustom-500 hover:bg-neutralCustom-50/10 hover:text-white"
                  }`}
                >
                  <svg
                    className="w-5 h-5 mr-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    {item.icon}
                  </svg>
                  {item.name}
                </Link>
              );
            }

            const childActive = item.children.some((child) =>
              isActive(child.path),
            );
            const isOpen = openMenus[item.path] ?? childActive;

            return (
              <div key={item.path}>
                <button
                  type="button"
                  onClick={() => toggleMenu(item.path)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-brand-md text-sm font-medium transition-colors ${
                    childActive
                      ? "bg-brand-600 text-white"
                      : "text-neutralCustom-500 hover:bg-neutralCustom-50/10 hover:text-white"
                  }`}
                >
                  <span className="flex items-center">
                    <svg
                      className="w-5 h-5 mr-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      {item.icon}
                    </svg>
                    {item.name}
                  </span>
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
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center px-4 py-2 bg-fiscal-danger/10 hover:bg-fiscal-danger text-fiscal-danger hover:text-white rounded-brand-md text-sm font-medium transition-all"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
