/**
 * Evita que la rueda del raton cambie el valor de un <input type="number">
 * enfocado (al desplazar la pagina se alteraban cantidades y precios sin querer).
 * Se instala una sola vez por app, en main.jsx. Devuelve la funcion para quitarlo.
 */
export default function preventNumberWheelChange() {
  const onWheel = () => {
    const el = document.activeElement;
    if (el instanceof HTMLInputElement && el.type === "number") el.blur();
  };
  document.addEventListener("wheel", onWheel, { passive: true });
  return () => document.removeEventListener("wheel", onWheel);
}
