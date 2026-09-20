import { useState } from "react";
import { SearchableSelect, Button, PlusIcon, IconButton, TrashIcon } from "@ingefact/ui";

const formatCOP = (value) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);

export default function SeccionLineasDocumentoSoporte({
  lineas,
  productos,
  error,
  onAddLinea,
  onRemoveLinea,
  onLineaCantidadChange,
  onLineaPrecioChange,
  onCrearProducto,
}) {
  const [productoId, setProductoId] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [addError, setAddError] = useState("");

  const productoOptions = productos.map((p) => ({ code: p.id, value: `${p.nombre} (${formatCOP(p.precio)})` }));

  const handleAgregar = () => {
    if (!productoId) {
      setAddError("Selecciona un producto para agregarlo.");
      return;
    }
    const cantidadNum = Number(cantidad);
    if (!cantidad || Number.isNaN(cantidadNum) || cantidadNum <= 0) {
      setAddError("La cantidad debe ser mayor a 0.");
      return;
    }
    onAddLinea(productoId, cantidadNum);
    setProductoId("");
    setCantidad("1");
    setAddError("");
  };

  return (
    <div className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-neutralCustom-800">Productos y Servicios</h3>
        <Button
          onClick={onCrearProducto}
          variant="link"
          icon={PlusIcon}
          className="text-xs"
        >
          Nuevo producto
        </Button>
      </div>

      <div className="flex items-end gap-3 p-3 bg-neutralCustom-50 border border-neutralCustom-100 rounded-brand-md">
        <div className="flex-1">
          <label className="block text-xs font-medium text-neutralCustom-500 mb-1">Producto / Servicio</label>
          <SearchableSelect
            options={productoOptions}
            value={productoId}
            onChange={(id) => {
              setProductoId(id);
              setAddError("");
            }}
            placeholder="Buscar producto..."
            formatOption={(opt) => opt.value}
          />
        </div>
        <div className="w-24">
          <label className="block text-xs font-medium text-neutralCustom-500 mb-1">Cantidad</label>
          <input
            type="number"
            min="0"
            step="1"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            className="w-full px-3 py-2 border border-neutralCustom-200 rounded-brand-md text-sm text-right focus:outline-none focus:border-brand-400"
          />
        </div>
        <Button
          onClick={handleAgregar}
          variant="primary"
          icon={PlusIcon}
          className="shrink-0"
        >
          Agregar
        </Button>
      </div>
      {addError && <p className="text-xs text-fiscal-danger mt-2">{addError}</p>}

      {lineas.length > 0 ? (
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left text-sm min-w-[680px]">
            <thead>
              <tr className="text-xs text-neutralCustom-500 uppercase border-b border-neutralCustom-200">
                <th className="pb-2 font-semibold w-24">Cod</th>
                <th className="pb-2 font-semibold">Descripción</th>
                <th className="pb-2 font-semibold text-right w-20">Cant.</th>
                <th className="pb-2 font-semibold text-right w-28">Precio Unit.</th>
                <th className="pb-2 font-semibold text-right w-28">Total</th>
                <th className="pb-2 font-semibold text-right w-28">Total</th>
                <th className="pb-2 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutralCustom-100">
              {lineas.map((linea, index) => {
                const cantidadInvalida = linea.cantidad !== "" && Number(linea.cantidad) <= 0;
                const precioInvalido = linea.precio_unitario !== "" && Number(linea.precio_unitario) <= 0;
                const subtotalLinea = (Number(linea.cantidad) || 0) * (Number(linea.precio_unitario) || 0);

                return (
                  <tr key={index}>
                    <td className="py-2 pr-2 text-xs text-neutralCustom-500 align-top">
                      {linea.producto?.codigo || "-"}
                    </td>
                    <td className="py-2 pr-2 align-top">
                      {linea.producto?.nombre}
                    </td>
                    <td className="py-2 pr-2 align-top">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={linea.cantidad}
                        onChange={(e) => onLineaCantidadChange(index, e.target.value)}
                        className={`w-full px-2 py-1.5 border rounded-brand-md text-sm text-right focus:outline-none ${
                          cantidadInvalida ? "border-fiscal-danger" : "border-neutralCustom-200 focus:border-brand-400"
                        }`}
                      />
                    </td>
                    <td className="py-2 pr-2 align-top">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={linea.precio_unitario}
                        onChange={(e) => onLineaPrecioChange(index, e.target.value)}
                        className={`w-full px-2 py-1.5 border rounded-brand-md text-sm text-right focus:outline-none ${
                          precioInvalido ? "border-fiscal-danger" : "border-neutralCustom-200 focus:border-brand-400"
                        }`}
                      />
                    </td>
                    <td className="py-2 pr-2 text-right font-medium align-top">{formatCOP(subtotalLinea)}</td>
                    <td className="py-2 text-right align-top">
                      <IconButton title="Quitar línea" variant="danger" onClick={() => onRemoveLinea(index)}>
                        <TrashIcon />
                      </IconButton>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-neutralCustom-400 text-center py-6 border-2 border-dashed border-neutralCustom-200 rounded-brand-md mt-4">
          Aún no has agregado productos. Búscalo arriba y dale a "+ Agregar".
        </p>
      )}
      {error && <p className="text-xs text-fiscal-danger mt-2">{error}</p>}
    </div>
  );
}
