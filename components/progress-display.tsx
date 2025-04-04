"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Star, Trophy, Zap } from "lucide-react";
import { getProgress, defaultProgress } from "@/lib/local-storage";
import { UserProgress } from "@/lib/local-storage";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";

export function ProgressDisplay() {
  // Using Next.js hydration safety pattern
  const [mounted, setMounted] = useState(false);
  const [progress, setProgress] = useState<UserProgress>(defaultProgress);
  const [iconClass, setIconClass] = useState("text-purple-500"); // Default to purple for SSR
  const router = useRouter();
  const { theme, resolvedTheme } = useTheme();

  useEffect(() => {
    // Mark as mounted (hydration complete)
    setMounted(true);
    
    // Now we can safely access localStorage
    setProgress(getProgress());

    // Now that we're on the client, we can update the icon class based on theme
    setIconClass(
      theme === "dark" || resolvedTheme === "dark" 
        ? "text-lime-500" 
        : "text-purple-500"
    );

    const handleStorageChange = () => {
      setProgress(getProgress());
    };

    // Update progress when local storage changes
    window.addEventListener("storage", handleStorageChange);
    
    // Also listen for custom events that might be dispatched when progress changes
    window.addEventListener("progressUpdated", handleStorageChange);
    
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("progressUpdated", handleStorageChange);
    };
  }, [theme, resolvedTheme]);

  // Use a skeleton loader during hydration
  if (!mounted) {
    return (
      <div className="flex items-center gap-4">
        <Card className="p-2 flex items-center gap-2 animate-pulse">
          <div className="w-4 h-4 bg-muted rounded-full"></div>
          <div className="w-16 h-4 bg-muted rounded"></div>
        </Card>
        <Card className="p-2 flex items-center gap-2 animate-pulse">
          <div className="w-4 h-4 bg-muted rounded-full"></div>
          <div className="w-8 h-4 bg-muted rounded"></div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <Card className="p-2 flex items-center gap-2">
        <Zap className={`h-4 w-4 ${iconClass}`} />
        <span className="font-medium">{progress.streak} day streak</span>
      </Card>
      <Card className="p-2 flex items-center gap-2">
        <Star className={`h-4 w-4 ${iconClass}`} />
        <span className="font-medium">{progress.stars}</span>
      </Card>
      {/* <Card className="p-2 flex items-center gap-2">
        <Trophy className={`h-4 w-4 ${iconClass}`} />
        <span className="font-medium">{progress.achievements.length}</span>
      </Card> */}
    </div>
  );
}