import { useEffect, useState } from "react";
import { getLogoEmpresa } from "@ingefact/core-api";

/** Data URL del logo, solo si la empresa lo tiene y eligió imprimirlo. */
export function useLogoDocumentos(empresa) {
  const [dataUrl, setDataUrl] = useState(null);
  const debeMostrar = Boolean(empresa?.tiene_logo && empresa?.mostrar_logo);

  useEffect(() => {
    if (!debeMostrar) return undefined;
    let vigente = true;
    getLogoEmpresa()
      .then((data) => vigente && setDataUrl(data.data_url))
      .catch(() => vigente && setDataUrl(null));
    return () => {
      vigente = false;
    };
  }, [debeMostrar]);

  return debeMostrar ? dataUrl : null;
}
