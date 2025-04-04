"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";

interface GraphDisplayProps {
  functions: string[];
}

export function GraphDisplay({ functions }: GraphDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || functions.length === 0) return;

    const loadGraph = async () => {
      try {
        // We need to dynamically import function-plot because it's a client-side only library
        const functionPlot = (await import("function-plot")).default;

        // Clear previous content
        if (containerRef.current) {
          containerRef.current.innerHTML = "";
        }

        // Parse each function to a format that function-plot can understand
        const data = functions.map((func) => {
          let fnString = func;
          
          // Handle functions in the format "y = ..."
          if (fnString.startsWith("y =")) {
            fnString = fnString.substring(4).trim();
          }
          
          return {
            fn: fnString,
            color: getRandomColor()
          };
        });

        // Create the graph
        if (containerRef.current) {
          functionPlot({
            target: "#function-plot-container",
            width: containerRef.current.offsetWidth,
            height: 300,
            yAxis: { domain: [-10, 10] },
            xAxis: { domain: [-10, 10] },
            grid: true,
            data
          });
        }

        setError(null);
      } catch (err) {
        console.error("Error rendering graph:", err);
        setError("Could not render graph for the given functions");
      }
    };

    loadGraph();
  }, [functions]);

  // Helper function to generate random colors for different functions
  function getRandomColor() {
    const colors = [
      "#3498db", // Blue
      "#e74c3c", // Red
      "#2ecc71", // Green
      "#9b59b6", // Purple
      "#f1c40f", // Yellow
      "#1abc9c", // Teal
      "#e67e22", // Orange
      "#34495e"  // Dark blue
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  if (functions.length === 0) {
    return null;
  }

  return (
    <Card className="p-4">
      <h3 className="text-lg font-medium mb-2">Graph Visualization</h3>
      {error ? (
        <div className="text-red-500 p-4">{error}</div>
      ) : (
        <div id="function-plot-container" className="w-full h-[300px]" ref={containerRef} />
      )}
      <div className="mt-2">
        <h4 className="text-sm font-medium mb-1">Functions:</h4>
        <ul className="text-sm text-muted-foreground">
          {functions.map((func, index) => (
            <li key={index}>{func}</li>
          ))}
        </ul>
      </div>
    </Card>
  );
}