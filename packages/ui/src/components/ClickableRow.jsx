import { Link, useNavigate } from "react-router-dom";

const INTERACTIVE = "a, button, input, select, textarea, label, [role='button'], [role='dialog'], [role='alertdialog']";

/**
 * Fila de tabla que lleva al detalle al hacer clic en cualquier parte de ella
 * (comodidad para mouse). La fila NO es el control accesible: dentro debe ir
 * un <ClickableRow.Link> en la celda principal, que es lo que usan el
 * teclado y los lectores de pantalla. Los clics sobre botones o enlaces de
 * la fila (acciones) se ignoran aqui, sin necesidad de stopPropagation.
 */
export default function ClickableRow({ to, className = "", children }) {
  const navigate = useNavigate();

  const handleClick = (event) => {
    if (event.target.closest(INTERACTIVE)) return;
    // No robar la seleccion de texto (p. ej. copiar un numero o un CUFE).
    if (window.getSelection?.().toString()) return;
    navigate(to);
  };

  return (
    <tr onClick={handleClick} className={`cursor-pointer hover:bg-neutralCustom-50 transition-colors ${className}`}>
      {children}
    </tr>
  );
}

function RowLink({ to, children, className = "" }) {
  return (
    <Link
      to={to}
      className={`rounded-sm hover:text-brand-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${className}`}
    >
      {children}
    </Link>
  );
}

ClickableRow.Link = RowLink;
