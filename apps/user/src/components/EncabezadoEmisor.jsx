import { useLogoDocumentos } from "../hooks/useLogoDocumentos";
import { nombreComercialVisible } from "../utils/nombreEmisor";

/** Logo de la empresa para el encabezado de las representaciones gráficas. */
export function LogoDocumento({ empresa }) {
  const dataUrl = useLogoDocumentos(empresa);
  if (!dataUrl) return null;
  return <img src={dataUrl} alt="Logo de la empresa" className="max-h-16 max-w-[160px] object-contain shrink-0" />;
}

/** Nombre comercial arriba (si aplica) y la razón social debajo. */
export function NombreEmisor({ empresa }) {
  const comercial = nombreComercialVisible(empresa);
  if (!comercial) return <p className="font-semibold">{empresa?.razon_social}</p>;
  return (
    <>
      <p className="font-semibold">{comercial}</p>
      <p>{empresa.razon_social}</p>
    </>
  );
}
