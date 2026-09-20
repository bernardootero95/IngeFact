/** Iconos de trazo (estilo outline) compartidos por botones y acciones de tabla. */
function makeIcon(path, strokeWidth = 2) {
  return function Icon({ className = "h-4 w-4" }) {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d={path} />
      </svg>
    );
  };
}

export const PlusIcon = makeIcon("M12 4v16m8-8H4");

export const PencilIcon = makeIcon(
  "M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z",
  1.75,
);

export const TrashIcon = makeIcon(
  "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
  1.75,
);

export const ArrowLeftIcon = makeIcon("M10 19l-7-7m0 0l7-7m-7 7h18");

export const RefreshIcon = makeIcon(
  "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15",
);
