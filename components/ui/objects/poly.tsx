"use client"

import { useRef, useMemo, useState, useEffect } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { OrbitControls, Environment, Edges } from "@react-three/drei"
import * as THREE from "three"
import { useTheme } from "next-themes"

// Declare the namespace for JSX elements from react-three-fiber
declare global {
  namespace JSX {
    interface IntrinsicElements {
      group: any
      mesh: any
      ambientLight: any
      directionalLight: any
      pointLight: any
      meshStandardMaterial: any
      planeGeometry: any
      shadowMaterial: any
    }
  }
}

export default function LowPolySphereVisualization() {
  const [error, setError] = useState<string | null>(null)
  const [contextLost, setContextLost] = useState(false)

  // Handle any errors that occur during rendering
  const handleError = (e: ErrorEvent) => {
    console.error("Three.js error:", e)
    setError("Failed to initialize 3D visualization")
  }

  useEffect(() => {
    window.addEventListener('error', handleError)
    
    // Reset error state if we recover
    const handleContextRestored = () => {
      setContextLost(false)
    }
    
    // Handle WebGL context loss specifically
    const handleContextLost = () => {
      console.warn("WebGL context lost")
      setContextLost(true)
    }
    
    window.addEventListener('webglcontextlost', handleContextLost)
    window.addEventListener('webglcontextrestored', handleContextRestored)
    
    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('webglcontextlost', handleContextLost)
      window.removeEventListener('webglcontextrestored', handleContextRestored)
    }
  }, [])

  if (error || contextLost) {
    return (
      <div className="w-full h-full min-h-[300px] flex items-center justify-center bg-primary/5 rounded-lg border">
        <p className="text-muted-foreground">Could not load 3D visualization</p>
      </div>
    )
  }

  return (
    <div className="w-full h-full min-h-[300px] rounded-lg overflow-hidden relative">
      <Canvas 
        camera={{ position: [0, 0, 6], fov: 45 }}
        gl={{ alpha: true, powerPreference: 'default', failIfMajorPerformanceCaveat: false }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
        }}
      >
        <ambientLight intensity={1.0} />
        <directionalLight position={[5, 5, 5]} intensity={2.0} castShadow />
        <LowPolySphere position={[0, 0, 0]} rotation={[0.3, 0.7, 0]} />
        <OrbitControls 
          enablePan={false} 
          enableZoom={false}
          minDistance={5} 
          maxDistance={10}
          autoRotate
          autoRotateSpeed={0.5}
        />
      </Canvas>
    </div>
  )
}

interface LowPolySphereProps {
  position: [number, number, number]
  rotation: [number, number, number]
}

function LowPolySphere({ position, rotation }: LowPolySphereProps) {
  const sphereRef = useRef<THREE.Group>(null)
  const { theme, resolvedTheme } = useTheme()
  const isDarkTheme = theme === "dark" || resolvedTheme === "dark"

  // Slowly rotate the sphere
  useFrame((_state, delta) => {
    if (sphereRef.current) {
      sphereRef.current.rotation.y += delta * 0.1
    }
  })

  // Create a custom geometry with colored faces
  const geometry = useMemo(() => {
    // Create a base icosahedron with increased radius
    const baseGeometry = new THREE.IcosahedronGeometry(1.6, 1)

    // Define color palettes for dark and light themes
    const darkThemeColors = [
      new THREE.Color("#32CD32"), // Lime Green
      new THREE.Color("#32CD32"), // Added twice to increase its frequency
      new THREE.Color("#32CD32"), // Added three times to ensure it appears frequently
      new THREE.Color("#39FF14"), // Neon Green
      new THREE.Color("#7CFC00"), // Lawn Green
      new THREE.Color("#00FF00"), // Pure Lime
      new THREE.Color("#ADFF2F"), // Green Yellow
      new THREE.Color("#7FFF00"), // Chartreuse
      new THREE.Color("#00FF7F"), // Spring Green
      new THREE.Color("#98FB98"), // Pale Green
    ]
    
    const lightThemeColors = [
      new THREE.Color("#8800FF"), // Deep Purple
      new THREE.Color("#8800FF"), // Added twice for frequency
      new THREE.Color("#6600CC"), // Rich Purple
      new THREE.Color("#4B0082"), // Indigo
      new THREE.Color("#9400D3"), // Dark Violet
      new THREE.Color("#7B68EE"), // Medium Slate Blue
      new THREE.Color("#6A0DAD"), // Purple
      new THREE.Color("#8A2BE2"), // Blue Violet
      new THREE.Color("#9932CC"), // Dark Orchid
      new THREE.Color("#800080"), // Purple
    ]
    
    // Choose the color palette based on theme
    const colorPalette = isDarkTheme ? darkThemeColors : lightThemeColors

    // Get position attribute
    const positions = baseGeometry.getAttribute("position")

    // Create a new geometry
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute("position", positions)

    // Create colors for each vertex
    const colors: number[] = []
    const vertexCount = positions.count

    // Each face has 3 vertices, so we need to assign the same color to each group of 3 vertices
    for (let i = 0; i < vertexCount; i += 3) {
      // Pick a random color from the palette for this face
      const color = colorPalette[Math.floor(Math.random() * colorPalette.length)]

      // Assign the same color to all 3 vertices of the face
      for (let j = 0; j < 3; j++) {
        colors.push(color.r, color.g, color.b)
      }
    }

    // Add colors to the geometry
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3))

    return geometry
  }, [isDarkTheme])

  return (
    <group 
      ref={sphereRef} 
      position={position} 
      rotation={rotation} 
      scale={1.4}
    >
      <mesh castShadow geometry={geometry}>
        <meshStandardMaterial 
          vertexColors 
          roughness={0.1} 
          metalness={0.2} 
          emissive={isDarkTheme ? "#32CD32" : "#8800FF"} 
          emissiveIntensity={0.3} 
        />
        <Edges scale={1} threshold={15} color={isDarkTheme ? "white" : "#4B0082"} />
      </mesh>
      <pointLight position={[0, 0, 3]} intensity={1.0} color="#FFFFFF" />
    </group>
  )
}

