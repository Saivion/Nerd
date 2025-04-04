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
  const router = useRouter();
  const { theme, resolvedTheme } = useTheme();
  
  // Determine if dark mode is active
  const isDarkTheme = theme === "dark" || resolvedTheme === "dark";

  useEffect(() => {
    // Mark as mounted (hydration complete)
    setMounted(true);
    
    // Now we can safely access localStorage
    setProgress(getProgress());

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
  }, []);

  // Only render actual data after hydration
  if (!mounted) {
    return (
      <div className="flex items-center gap-4">
      <Card className="p-2 flex items-center gap-2">
        <Zap className={`h-4 w-4 ${isDarkTheme ? "text-lime-500" : "text-purple-500"}`} />
        <span className="font-medium">{progress.streak} day streak</span>
      </Card>
      <Card className="p-2 flex items-center gap-2">
        <Star className={`h-4 w-4 ${isDarkTheme ? "text-lime-500" : "text-purple-500"}`} />
        <span className="font-medium">{progress.stars}</span>
      </Card>
      {/* <Card className="p-2 flex items-center gap-2">
        <Trophy className={`h-4 w-4 ${isDarkTheme ? "text-lime-500" : "text-purple-500"}`} />
        <span className="font-medium">{progress.achievements.length}</span>
      </Card> */}
    </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <Card className="p-2 flex items-center gap-2">
        <Zap className={`h-4 w-4 ${isDarkTheme ? "text-lime-500" : "text-purple-500"}`} />
        <span className="font-medium">{progress.streak} day streak</span>
      </Card>
      <Card className="p-2 flex items-center gap-2">
        <Star className={`h-4 w-4 ${isDarkTheme ? "text-lime-500" : "text-purple-500"}`} />
        <span className="font-medium">{progress.stars}</span>
      </Card>
      {/* <Card className="p-2 flex items-center gap-2">
        <Trophy className={`h-4 w-4 ${isDarkTheme ? "text-lime-500" : "text-purple-500"}`} />
        <span className="font-medium">{progress.achievements.length}</span>
      </Card> */}
    </div>
  );
}