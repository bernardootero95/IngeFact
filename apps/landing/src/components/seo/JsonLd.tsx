/**
 * Inserta datos estructurados schema.org. Se escapa "<" para que un texto
 * con "</script>" no pueda cerrar la etiqueta antes de tiempo.
 */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
