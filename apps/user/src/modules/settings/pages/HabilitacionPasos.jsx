const PORTAL_HABILITACION_DIAN = "https://catalogo-vpfe-hab.dian.gov.co/User/Login";

export function PortalDian() {
  return (
    <a
      href={PORTAL_HABILITACION_DIAN}
      target="_blank"
      rel="noopener noreferrer"
      className="text-brand-600 underline underline-offset-2"
    >
      portal de Habilitación de la DIAN
    </a>
  );
}

export function PasoProveedor({ software }) {
  return (
    <>
      elige el modo de operación <strong>Software de un proveedor tecnológico</strong>, en empresa proveedora
      selecciona <strong>Soluciones Alegra S.A.S.</strong> (proveedor tecnológico de IngeFact) y en software{" "}
      <strong>{software}</strong>. Haz clic en <strong>Asociar</strong>.
    </>
  );
}
