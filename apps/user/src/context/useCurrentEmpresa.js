import { useContext } from "react";
import { EmpresaContext } from "./EmpresaContext.js";

export function useCurrentEmpresa() {
  const context = useContext(EmpresaContext);
  if (context === undefined) {
    throw new Error("useCurrentEmpresa debe usarse dentro de un EmpresaProvider.");
  }
  return context;
}
