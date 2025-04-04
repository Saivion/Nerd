"use client"

import dynamic from "next/dynamic"
import { useState, useEffect } from "react"

// Import Three.js component with dynamic loading to avoid SSR issues
const LowPolySphereVisualization = dynamic(
  () => import("@/components/ui/objects/poly"),
  { ssr: false }
)

export default function HeroVisualization() {
  const [isClient, setIsClient] = useState(false)

  // Make sure we're on the client before attempting to render the 3D component
  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return (
      <div className="w-full h-[400px] rounded-lg border bg-primary/5 flex items-center justify-center">
        <div className="animate-pulse">Loading visualization...</div>
      </div>
    )
  }

  return (
    <div className="w-full h-[400px] rounded-lg relative overflow-hidden">
      <div className="absolute inset-0 z-10">
        <LowPolySphereVisualization />
      </div>
    </div>
  )
} 