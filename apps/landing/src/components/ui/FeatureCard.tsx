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
    <div className="h-full rounded-brand-lg border border-neutralCustom-100 bg-white p-7 text-left">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-brand-md bg-brand-50">
        <Icon className="h-5 w-5 text-brand-600" />
      </div>
      <h3 className="mb-2 text-[17px] font-bold text-neutralCustom-800">
        {href ? (
          <Link href={href} className="underline-offset-4 hover:text-brand-600 hover:underline">
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
