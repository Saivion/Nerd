"use client";

import { Brain } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { ProgressDisplay } from "./progress-display";
import { usePathname } from "next/navigation";
import Link from "next/link";

export function Navbar() {
  const pathname = usePathname();

  return (
    <div className="fixed top-0 w-full z-50 bg-background border-b border-border h-16 flex items-center px-4">
      <div className="mx-auto max-w-7xl w-full flex items-center justify-between">
        <Link href="/" className="flex items-center gap-x-2 hover:opacity-80 transition">
          <Brain className="h-8 w-8" />
          <span className="font-semibold text-xl">Nerd</span>
        </Link>
        <div className="flex items-center gap-x-4">
          <ProgressDisplay />
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}