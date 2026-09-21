/**
 * Forma y metodo de pago con que se envia un Documento Soporte a la DIAN.
 * Compartido por el formulario (enviar al guardar) y el detalle (enviar un
 * borrador ya guardado); quien lo usa maneja el estado y las validaciones.
 */
export default function SeccionPagoDocumentoSoporte({
  formaPago,
  metodoPago,
  formasPago,
  metodosPago,
  errors,
  onFormaPagoChange,
  onMetodoPagoChange,
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label htmlFor="forma_pago" className="block text-sm font-medium text-neutralCustom-800 mb-1.5">
          Forma de pago <span className="text-fiscal-danger">*</span>
        </label>
        <select
          id="forma_pago"
          value={formaPago}
          onChange={(e) => onFormaPagoChange(e.target.value)}
          className={`field w-full ${
            errors.formaPago ? "border-fiscal-danger field-invalid" : ""
          }`}
        >
          {formasPago.map((opt) => (
            <option key={opt.code} value={opt.code}>
              {opt.value}
            </option>
          ))}
        </select>
        {errors.formaPago && <p className="mt-1 text-sm text-fiscal-danger">{errors.formaPago}</p>}
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
            errors.metodoPago ? "border-fiscal-danger field-invalid" : ""
          }`}
        >
          {metodosPago.map((opt) => (
            <option key={opt.code} value={opt.code}>
              {opt.value}
            </option>
          ))}
        </select>
        {errors.metodoPago && <p className="mt-1 text-sm text-fiscal-danger">{errors.metodoPago}</p>}
      </div>
    </div>
  );
}
