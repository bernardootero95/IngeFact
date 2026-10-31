import Link from "next/link";
import type { ComponentType } from "react";

interface FeatureCardProps {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  href?: string;
}

export function FeatureCard({ icon: Icon, title, description, href }: FeatureCardProps) {
  return (
    <div
      className={`relative h-full rounded-brand-lg border border-neutralCustom-100 bg-white p-7 text-left ${
        href ? "transition-colors hover:border-brand-400" : ""
      }`}
    >
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-brand-md bg-brand-50">
        <Icon className="h-5 w-5 text-brand-600" />
      </div>
      <h3 className="mb-2 text-[17px] font-bold text-neutralCustom-800">
        {href ? (
          // after:inset-0 extiende el enlace a toda la tarjeta: el título solo
          // medía 20 px de alto, un objetivo táctil muy pequeño.
          <Link
            href={href}
            className="underline-offset-4 after:absolute after:inset-0 after:rounded-brand-lg hover:text-brand-600 hover:underline"
          >
            {title}
          </Link>
        ) : (
          title
        )}
      </h3>
      <p className="text-sm leading-relaxed text-neutralCustom-500">{description}</p>
    </div>
  );
}
