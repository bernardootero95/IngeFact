import { useState } from "react";
import { consultarCufe } from "@ingefact/core-api";
import { SearchableSelect } from "@ingefact/ui";

const formatCOP = (value) =>
  value == null
    ? "-"
    : new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);

/**
 * "Cargar desde CUFE" (Fase 5) -- consulta GET /get-by-trackid via
 * consultarCufe. El resumen del documento (fecha/monto de referencia)
 * funciona para cualquier CUFE real; las lineas y el proveedor sugerido
 * solo vienen si Alegra tiene custodia del XML (la empresa emisora esta
 * bajo la misma cuenta de Alegra) -- para un proveedor externo tipico esto
 * normalmente NO estara disponible, asi que este componente siempre deja
 * seguir el flujo manual sin bloquear nada.
 */
export default function SeccionCufeCompra({ productos, proveedores, onAplicar, onCrearProveedor }) {
  const [cufe, setCufe] = useState("");
  const [isBuscando, setIsBuscando] = useState(false);
  const [error, setError] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [seleccionPorLinea, setSeleccionPorLinea] = useState([]);

  const productoOptions = productos.map((p) => ({ code: p.id, value: `${p.nombre} (${formatCOP(p.precio)})` }));

  const proveedorExistente =
    resultado?.proveedor_sugerido?.proveedor_id_existente &&
    proveedores.find((p) => p.id === resultado.proveedor_sugerido.proveedor_id_existente);

  const handleBuscar = async () => {
    if (!cufe.trim()) return;
    setIsBuscando(true);
    setError(null);
    setResultado(null);
    try {
      const datos = await consultarCufe(cufe.trim());
      setResultado(datos);
      setSeleccionPorLinea((datos.lineas || []).map(() => ({ producto_id: "", cantidad: "", precio_unitario: "" })));
    } catch (err) {
      if (err.status === 404) {
        setError("No encontramos ningún documento con ese CUFE ante la DIAN. Verifica que esté bien escrito.");
      } else {
        setError(err.message);
      }
    } finally {
      setIsBuscando(false);
    }
  };

  const handleSeleccionChange = (index, campo, valor) => {
    setSeleccionPorLinea((prev) => prev.map((sel, i) => (i === index ? { ...sel, [campo]: valor } : sel)));
  };

  const handleAplicar = () => {
    const lineasResueltas = (resultado.lineas || [])
      .map((linea, index) => {
        const seleccion = seleccionPorLinea[index];
        if (!seleccion.producto_id) return null;
        const producto = productos.find((p) => p.id === seleccion.producto_id) || null;
        return {
          producto_id: seleccion.producto_id,
          cantidad: seleccion.cantidad || String(linea.cantidad),
          precio_unitario: seleccion.precio_unitario || String(linea.precio_unitario),
          producto,
        };
      })
      .filter(Boolean);

    onAplicar({
      fecha: resultado.fecha,
      cufe: cufe.trim(),
      numeroDocumentoProveedor: resultado.numero_documento_proveedor,
      proveedorIdExistente: resultado.proveedor_sugerido?.proveedor_id_existente || null,
      lineas: lineasResueltas,
    });

    setResultado(null);
    setCufe("");
  };

  const totalLineas = resultado?.lineas?.length || 0;
  const lineasAsociadas = seleccionPorLinea.filter((s) => s.producto_id).length;

  return (
    <div className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm p-6">
      <h3 className="text-base font-semibold text-neutralCustom-800 mb-1">Cargar desde CUFE (factura electrónica)</h3>
      <p className="text-xs text-neutralCustom-500 mb-4">
        Si tu proveedor te facturó electrónicamente, pega aquí el CUFE — te ayudamos a prellenar la fecha y, cuando
        esté disponible, las líneas de la compra.
      </p>

      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label htmlFor="cufe-input" className="block text-xs font-medium text-neutralCustom-500 mb-1">
            CUFE
          </label>
          <input
            type="text"
            id="cufe-input"
            value={cufe}
            onChange={(e) => setCufe(e.target.value)}
            placeholder="Código único de facturación electrónica"
            className="w-full px-3 py-2 border border-neutralCustom-200 rounded-brand-md text-sm font-mono focus:outline-none focus:border-brand-400"
          />
        </div>
        <button
          type="button"
          onClick={handleBuscar}
          disabled={isBuscando || !cufe.trim()}
          className="px-4 py-2 bg-neutralCustom-800 hover:bg-neutralCustom-600 text-white text-sm font-medium rounded-brand-md transition-colors disabled:opacity-50 shrink-0"
        >
          {isBuscando ? "Buscando..." : "Buscar"}
        </button>
      </div>

      {error && <p className="text-xs text-fiscal-danger mt-3">{error}</p>}

      {resultado && (
        <div className="mt-4 p-4 bg-neutralCustom-50 border border-neutralCustom-100 rounded-brand-md space-y-3">
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-neutralCustom-700">
            {resultado.fecha && (
              <span>
                <span className="text-neutralCustom-500">Fecha:</span> {resultado.fecha}
              </span>
            )}
            <span>
              <span className="text-neutralCustom-500">Total de referencia:</span>{" "}
              {formatCOP(resultado.monto_referencia?.total)}
            </span>
          </div>

          {resultado.proveedor_sugerido ? (
            <div className="text-sm">
              {proveedorExistente ? (
                <p className="text-brand-600">
                  Proveedor encontrado en tu catálogo: <strong>{proveedorExistente.nombre}</strong>
                </p>
              ) : (
                <p className="text-neutralCustom-700 flex items-center gap-2 flex-wrap">
                  Proveedor sugerido: <strong>{resultado.proveedor_sugerido.nombre}</strong> (
                  {resultado.proveedor_sugerido.numero_identificacion}) — no está en tu catálogo.
                  <button
                    type="button"
                    onClick={() =>
                      onCrearProveedor(resultado.proveedor_sugerido, {
                        fecha: resultado.fecha,
                        cufe,
                        numeroDocumentoProveedor: resultado.numero_documento_proveedor,
                      })
                    }
                    className="text-xs font-medium text-brand-600 hover:text-brand-400"
                  >
                    + Crear proveedor con estos datos
                  </button>
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-neutralCustom-500">
              No pudimos identificar al proveedor automáticamente — selecciónalo tú abajo.
            </p>
          )}

          {resultado.lineas === null ? (
            <p className="text-xs text-neutralCustom-500">
              Este CUFE es válido pero no pudimos traer las líneas automáticamente (documento de otro proveedor de
              facturación electrónica) — agrégalas manualmente abajo.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-neutralCustom-700">
                {totalLineas} línea{totalLineas === 1 ? "" : "s"} encontrada{totalLineas === 1 ? "" : "s"} — asocia
                cada una a un producto:
              </p>
              {resultado.lineas.map((linea, index) => (
                <div key={index} className="flex flex-wrap items-end gap-2 p-2 bg-white border border-neutralCustom-100 rounded-brand-md">
                  <div className="text-xs text-neutralCustom-600 basis-full">{linea.descripcion}</div>
                  <div className="flex-1 min-w-[180px]">
                    <SearchableSelect
                      options={productoOptions}
                      value={seleccionPorLinea[index]?.producto_id || ""}
                      onChange={(id) => handleSeleccionChange(index, "producto_id", id)}
                      placeholder="Asociar a un producto..."
                      formatOption={(opt) => opt.value}
                    />
                  </div>
                  <div className="w-20">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={seleccionPorLinea[index]?.cantidad ?? linea.cantidad}
                      onChange={(e) => handleSeleccionChange(index, "cantidad", e.target.value)}
                      className="w-full px-2 py-1.5 border border-neutralCustom-200 rounded-brand-md text-sm text-right"
                    />
                  </div>
                  <div className="w-28">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={seleccionPorLinea[index]?.precio_unitario ?? linea.precio_unitario}
                      onChange={(e) => handleSeleccionChange(index, "precio_unitario", e.target.value)}
                      className="w-full px-2 py-1.5 border border-neutralCustom-200 rounded-brand-md text-sm text-right"
                    />
                  </div>
                </div>
              ))}
              <p className="text-xs text-neutralCustom-500">
                {lineasAsociadas} de {totalLineas} líneas asociadas a un producto.
              </p>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleAplicar}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-brand-md transition-colors"
            >
              Usar estos datos
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
