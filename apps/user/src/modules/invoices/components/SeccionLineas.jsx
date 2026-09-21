import { useState, useEffect, useId } from "react";
import { SearchableSelect, Button, PlusIcon, IconButton, TrashIcon } from "@ingefact/ui";
import { calcularLinea } from "@ingefact/utils";

const formatCOP = (value) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);

const FORMA_PAGO_CREDITO = "2";

export default function SeccionLineas({
  lineas,
  productos,
  productoPreseleccionadoId,
  formaPago,
  metodoPago,
  formasPago,
  metodosPago,
  fechaVencimiento,
  errores,
  onAddLinea,
  onRemoveLinea,
  onLineaCantidadChange,
  onLineaPrecioChange,
  onFormaPagoChange,
  onMetodoPagoChange,
  onFechaVencimientoChange,
  onCrearProducto,
}) {
  const productoFieldId = useId();
  const cantidadFieldId = useId();
  const [productoId, setProductoId] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [addError, setAddError] = useState("");

  // Al volver de "+ Nuevo Producto", el producto recien creado queda
  // preseleccionado en el buscador -- el usuario solo confirma la cantidad
  // y le da "+ Agregar".
  useEffect(() => {
    if (productoPreseleccionadoId) {
      setProductoId(productoPreseleccionadoId);
      setAddError("");
    }
  }, [productoPreseleccionadoId]);

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
          <label htmlFor={productoFieldId} className="block text-xs font-medium text-neutralCustom-500 mb-1">Producto / Servicio</label>
          <SearchableSelect
            id={productoFieldId}
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
          <label htmlFor={cantidadFieldId} className="block text-xs font-medium text-neutralCustom-500 mb-1">Cantidad</label>
          <input
            id={cantidadFieldId}
            type="number"
            min="0"
            step="1"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            className="field w-full text-right"
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
                <th scope="col" className="pb-2 font-semibold w-24">Cod</th>
                <th scope="col" className="pb-2 font-semibold">Descripción</th>
                <th scope="col" className="pb-2 font-semibold text-right w-20">Cant.</th>
                <th scope="col" className="pb-2 font-semibold text-right w-28">Precio Unit.</th>
                <th scope="col" className="pb-2 font-semibold text-right w-28">Subtotal</th>
                <th scope="col" className="pb-2 font-semibold text-right w-24">IVA</th>
                <th scope="col" className="pb-2 font-semibold text-right w-28">Total</th>
                <th scope="col" className="pb-2 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutralCustom-100">
              {lineas.map((linea, index) => {
                const cantidadInvalida = linea.cantidad !== "" && Number(linea.cantidad) <= 0;
                const precioInvalido = linea.precio_unitario !== "" && Number(linea.precio_unitario) <= 0;
                const {
                  subtotal: subtotalLinea,
                  excluido: excluidoLinea,
                  base: baseLinea,
                  impuesto: impuestoLinea,
                } = calcularLinea({
                  cantidad: linea.cantidad,
                  precio: linea.precio_unitario,
                  tarifa: linea.producto?.tarifa_impuesto,
                  valorExcluido: (Number(linea.cantidad) || 0) * (Number(linea.producto?.valor_impuesto_excluido) || 0),
                });

                return (
                  <tr key={index}>
                    <td className="py-2 pr-2 text-xs text-neutralCustom-500 align-top">
                      {linea.producto?.codigo || "-"}
                    </td>
                    <td className="py-2 pr-2 align-top">
                      {linea.producto?.nombre}
                      {linea.producto?.tributo && (
                        <p className="text-xs text-neutralCustom-500 mt-0.5">
                          {linea.producto.tributo} {linea.producto.tarifa_impuesto}%
                        </p>
                      )}
                      {excluidoLinea > 0 && (
                        <p className="text-xs text-neutralCustom-500 mt-0.5">
                          Base IVA {formatCOP(baseLinea)} (excluye {formatCOP(excluidoLinea)} de impuesto ya pagado)
                        </p>
                      )}
                    </td>
                    <td className="py-2 pr-2 align-top">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={linea.cantidad}
                        onChange={(e) => onLineaCantidadChange(index, e.target.value)}
                        className={`field field-sm w-full text-right ${
                          cantidadInvalida ? "border-fiscal-danger field-invalid" : ""
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
                        className={`field field-sm w-full text-right ${
                          precioInvalido ? "border-fiscal-danger field-invalid" : ""
                        }`}
                      />
                    </td>
                    <td className="py-2 pr-2 text-right align-top">{formatCOP(subtotalLinea)}</td>
                    <td className="py-2 pr-2 text-right align-top">{formatCOP(impuestoLinea)}</td>
                    <td className="py-2 pr-2 text-right font-medium align-top">
                      {formatCOP(subtotalLinea + impuestoLinea)}
                    </td>
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
        <p className="text-sm text-neutralCustom-500 text-center py-6 border-2 border-dashed border-neutralCustom-200 rounded-brand-md mt-4">
          Aún no has agregado productos. Búscalo arriba y dale a "+ Agregar".
        </p>
      )}
      {errores.lineas && <p className="text-xs text-fiscal-danger mt-2">{errores.lineas}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-6 border-t border-neutralCustom-100">
        <div>
          <label htmlFor="forma_pago" className="block text-sm font-medium text-neutralCustom-800 mb-1.5">
            Forma de pago <span className="text-fiscal-danger">*</span>
          </label>
          <select
            id="forma_pago"
            value={formaPago}
            onChange={(e) => onFormaPagoChange(e.target.value)}
            className={`field w-full ${
              errores.formaPago ? "border-fiscal-danger field-invalid" : ""
            }`}
          >
            {formasPago.map((opt) => (
              <option key={opt.code} value={opt.code}>
                {opt.value}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="metodo_pago" className="block text-sm font-medium text-neutralCustom-800 mb-1.5">
            Método de pago <span className="text-fiscal-danger">*</span>
          </label>
          <select
            id="metodo_pago"
            value={metodoPago}
            onChange={(e) => onMetodoPagoChange(e.target.value)}
            className={`field w-full ${
              errores.metodoPago ? "border-fiscal-danger field-invalid" : ""
            }`}
          >
            {metodosPago.map((opt) => (
              <option key={opt.code} value={opt.code}>
                {opt.value}
              </option>
            ))}
          </select>
          {errores.metodoPago && <p className="mt-1 text-xs text-fiscal-danger">{errores.metodoPago}</p>}
        </div>

        {formaPago === FORMA_PAGO_CREDITO && (
          <div>
            <label htmlFor="fecha_vencimiento" className="block text-sm font-medium text-neutralCustom-800 mb-1.5">
              Fecha de vencimiento <span className="text-fiscal-danger">*</span>
            </label>
            <input
              type="date"
              id="fecha_vencimiento"
              value={fechaVencimiento}
              onChange={(e) => onFechaVencimientoChange(e.target.value)}
              className={`field w-full ${
                errores.fechaVencimiento ? "border-fiscal-danger field-invalid" : ""
              }`}
            />
            {errores.fechaVencimiento && <p className="mt-1 text-xs text-fiscal-danger">{errores.fechaVencimiento}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
