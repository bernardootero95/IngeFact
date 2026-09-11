import Link from "next/link";
import type { ReactNode } from "react";

interface ButtonProps {
  href: string;
  children: ReactNode;
  icon?: ReactNode;
  external?: boolean;
  className?: string;
}

const baseClasses =
  "inline-flex items-center justify-center gap-2 rounded-brand-md px-6 py-3 text-[15px] font-semibold transition-colors";

export function PrimaryButton({ href, children, icon, external, className = "" }: ButtonProps) {
  const classes = `${baseClasses} bg-brand-600 text-white hover:bg-brand-400 ${className}`;
  const content = (
    <>
      {icon}
      {children}
    </>
  );
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={classes}>
        {content}
      </a>
    );
  }
  return (
    <Link href={href} className={classes}>
      {content}
    </Link>
  );
}

export function SecondaryButton({ href, children, external, className = "" }: ButtonProps) {
  const classes = `${baseClasses} border border-neutralCustom-100 bg-white text-neutralCustom-800 hover:border-brand-400 hover:text-brand-600 ${className}`;
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={classes}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );
}
