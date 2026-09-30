import { useCallback, useEffect, useMemo, useState } from "react";
import { filterItems } from "@ingefact/ui";

/**
 * Carga y filtrado de un listado de documentos (facturas, notas, nomina,
 * documento soporte). La API devuelve la lista completa, asi que la busqueda
 * por texto y el filtro por estado se aplican en el cliente: responden al
 * instante y no vuelven a pedir la lista en cada tecla.
 *
 * - `cargar`: funcion async que devuelve la lista.
 * - `searchKeys`: columnas donde busca el texto libre.
 */
export default function useListadoDocumentos(cargar, { searchKeys }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState("");

  const recargar = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setItems(await cargar());
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setLoading(false);
    }
  }, [cargar]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  // searchKeys llega como arreglo literal: se compara por contenido.
  const keys = searchKeys.join("|");
  const filtrados = useMemo(() => {
    const porEstado = estado ? items.filter((item) => item.estado === estado) : items;
    return filterItems(porEstado, keys.split("|"), search);
  }, [items, estado, search, keys]);

  const quitar = useCallback((id) => setItems((prev) => prev.filter((item) => item.id !== id)), []);

  return {
    items,
    filtrados,
    loading,
    loadError,
    recargar,
    quitar,
    search,
    setSearch,
    estado,
    setEstado,
    hayFiltros: Boolean(search.trim() || estado),
  };
}
