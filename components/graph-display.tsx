"use client";

import { useEffect, useRef } from 'react';
import functionPlot from 'function-plot';

interface GraphDisplayProps {
  functions: string[];
  xRange?: [number, number];
  yRange?: [number, number];
}

export function GraphDisplay({ 
  functions,
  xRange = [-10, 10],
  yRange = [-10, 10]
}: GraphDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    try {
      functionPlot({
        target: containerRef.current,
        width: 600,
        height: 400,
        grid: true,
        xAxis: {
          domain: xRange,
          label: 'x'
        },
        yAxis: {
          domain: yRange,
          label: 'y'
        },
        data: functions.map(fn => ({
          fn,
          graphType: 'polyline'
        }))
      });
    } catch (err) {
      console.error('Failed to plot graph:', err);
    }
  }, [functions, xRange, yRange]);

  return (
    <div 
      ref={containerRef}
      className="w-full max-w-2xl mx-auto bg-card rounded-lg shadow-sm p-4"
    />
  );
}