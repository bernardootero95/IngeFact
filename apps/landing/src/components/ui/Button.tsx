import Link from "next/link";
import type { ReactNode } from "react";
import { NewTabHint } from "@/components/ui/NewTabHint";

interface ButtonProps {
  href: string;
  children: ReactNode;
  icon?: ReactNode;
  external?: boolean;
  className?: string;
}

const baseClasses =
  "inline-flex items-center justify-center gap-2 rounded-brand-md px-6 py-3 text-[15px] font-semibold transition-colors";

function ButtonLink({ href, external, className, children }: Omit<ButtonProps, "icon"> & { className: string }) {
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
        <NewTabHint />
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

export function PrimaryButton({ href, children, icon, external, className = "" }: ButtonProps) {
  return (
    <ButtonLink href={href} external={external} className={`${baseClasses} bg-brand-600 text-white hover:bg-brand-700 ${className}`}>
      {icon}
      {children}
    </ButtonLink>
  );
}

export function SecondaryButton({ href, children, external, className = "" }: ButtonProps) {
  return (
    <ButtonLink
      href={href}
      external={external}
      className={`${baseClasses} border border-neutralCustom-100 bg-white text-neutralCustom-800 hover:border-brand-400 hover:text-brand-600 ${className}`}
    >
      {children}
    </ButtonLink>
  );
}
