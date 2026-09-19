import { useSearchParams } from "react-router-dom";
import Sidebar from "../../../components/Sidebar";
import ResolutionPanel from "./ResolutionPanel";
import SupportDocumentResolutionPanel from "./SupportDocumentResolutionPanel";

const TABS = [
  { id: "facturacion", label: "Facturación electrónica", Panel: ResolutionPanel },
  { id: "documento-soporte", label: "Documento Soporte", Panel: SupportDocumentResolutionPanel },
];

const DEFAULT_TAB = TABS[0].id;

export default function ResolutionsSettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const activeTab = TABS.some((tab) => tab.id === requestedTab) ? requestedTab : DEFAULT_TAB;

  const selectTab = (tabId) => {
    setSearchParams(tabId === DEFAULT_TAB ? {} : { tab: tabId }, { replace: true });
  };

  return (
    <div className="min-h-screen flex bg-neutralCustom-50 font-sans">
      <Sidebar />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-neutralCustom-100 flex items-center justify-between px-8 shrink-0">
          <div>
            <h2 className="text-lg font-medium text-neutralCustom-800">Resoluciones DIAN</h2>
            <p className="text-xs text-neutralCustom-500">
              Numeración autorizada por la DIAN para cada tipo de documento que emites.
            </p>
          </div>
        </header>

        <div className="px-8 bg-white border-b border-neutralCustom-100 shrink-0">
          <div role="tablist" aria-label="Tipo de resolución" className="flex gap-6">
            {TABS.map((tab) => {
              const selected = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  id={`tab-${tab.id}`}
                  aria-selected={selected}
                  aria-controls={`panel-${tab.id}`}
                  onClick={() => selectTab(tab.id)}
                  className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                    selected
                      ? "border-brand-600 text-brand-600"
                      : "border-transparent text-neutralCustom-500 hover:text-neutralCustom-800"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-8 flex-1 overflow-y-auto">
          {/* Ambos paneles quedan montados y solo se oculta el inactivo: asi
              cambiar de pestana no pierde lo que se este editando. */}
          {TABS.map(({ id, Panel }) => (
            <div key={id} role="tabpanel" id={`panel-${id}`} aria-labelledby={`tab-${id}`} hidden={id !== activeTab}>
              <Panel />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
