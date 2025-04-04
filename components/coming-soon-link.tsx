"use client";

import { ReactNode } from "react";

interface ComingSoonLinkProps {
  href: string;
  className?: string;
  children: ReactNode;
}

export function ComingSoonLink({ href, className, children }: ComingSoonLinkProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  return (
    <a href={href} className={className} onClick={handleClick}>
      {children}
    </a>
  );
} 