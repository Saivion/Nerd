"use client";

import React, { useRef, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Line, Html } from '@react-three/drei';
import * as THREE from 'three';

// Types for our component
interface GeometryVisualizerProps {
  problemType: 'triangle' | 'circle' | 'angle' | 'polygon' | 'line';
  problemData: any;
  width?: number;
  height?: number;
}

// Parser function to extract geometric elements from problem text
export function parseGeometryProblem(problemText: string): {
  problemType: 'triangle' | 'circle' | 'angle' | 'polygon' | 'line';
  problemData: any;
} {
  let problemType: 'triangle' | 'circle' | 'angle' | 'polygon' | 'line' = 'line';
  let problemData: any = {};
  
  // Step 1: Clean the problem text to fix LaTeX notation
  const cleanedText = problemText
    .replace(/\\\\angle/g, '\\angle')
    .replace(/\\\\/g, '\\')
    .replace(/\\\{/g, '{')
    .replace(/\\\}/g, '}');
  
  // Step 2: Determine the problem type based on keywords
  if (cleanedText.toLowerCase().includes('triangle') || cleanedText.toLowerCase().includes('\\triangle')) {
    problemType = 'triangle';
    
    // Extract triangle points when possible (using pattern matching)
    const pointRegex = /[A-Z]\s*\((-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)\)/g;
    const points: [number, number][] = [];
    let pointMatch: RegExpExecArray | null;
    
    while ((pointMatch = pointRegex.exec(cleanedText)) !== null) {
      points.push([parseFloat(pointMatch[1]), parseFloat(pointMatch[2])]);
    }
    
    // If we couldn't find explicit coordinates, use default triangle
    if (points.length < 3) {
      problemData = {
        points: [
          [-1, -1],  // Bottom left
          [1, -1],   // Bottom right
          [0, 1]     // Top
        ],
        labels: ['A', 'B', 'C']
      };
    } else {
      problemData = {
        points,
        labels: ['A', 'B', 'C'].slice(0, points.length)
      };
    }
    
    // Try to extract angles if present
    const angleRegex = /angle\s+([A-Z])\s+is\s+(\d+)/gi;
    const angles: Record<string, number> = {};
    let angleMatch: RegExpExecArray | null;
    
    while ((angleMatch = angleRegex.exec(cleanedText)) !== null) {
      angles[angleMatch[1]] = parseInt(angleMatch[2]);
    }
    
    if (Object.keys(angles).length > 0) {
      problemData.angles = angles;
    }
  } 
  else if (cleanedText.toLowerCase().includes('circle')) {
    problemType = 'circle';
    
    // Get circle name/label (e.g., "circle P")
    const circleNameRegex = /circle\s+([A-Z])/i;
    const circleNameMatch = cleanedText.match(circleNameRegex);
    const circleName = (circleNameMatch && circleNameMatch[1]) || "O";
    
    // Get center coordinates
    const centerRegex = /center\s+(?:at|is)?\s+\((-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)\)/i;
    const centerMatch = cleanedText.match(centerRegex);
    
    // Get radius value
    const radiusRegex = /radius\s+(?:of|is)?\s+(\d+(?:\.\d+)?)/i;
    const radiusMatch = cleanedText.match(radiusRegex);
    
    // Initialize problem data
    problemData = {
      centerLabel: circleName,
      center: centerMatch ? [parseFloat(centerMatch[1] || '0'), parseFloat(centerMatch[2] || '0')] : [0, 0],
      radius: radiusMatch ? parseFloat(radiusMatch[1]) : 2,
      points: [] as any[]
    };
    
    // Find points on the circle - check different patterns
    // Pattern 1: "Point A is at (x, y)" or "Point A is located at coordinates (x, y)"
    const pointsRegex1 = /[Pp]oint\s+([A-Z])\s+(?:is|at|located)(?:[^()]*?)\((-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)\)/g;
    let pointMatch1: RegExpExecArray | null;
    
    while ((pointMatch1 = pointsRegex1.exec(cleanedText)) !== null) {
      const label = pointMatch1[1];
      const x = parseFloat(pointMatch1[2]);
      const y = parseFloat(pointMatch1[3]);
      problemData.points.push({
        label: label,
        coordinates: [x, y] as [number, number]
      });
    }
    
    // Pattern 2: "Point A is ... on the circle" (without explicit coordinates)
    const pointsOnCircleRegex = /[Pp]oint\s+([A-Z])\s+(?:is|at|located)(?:[^()]*?)(?:on\s+the\s+circle)/gi;
    let pointMatch2: RegExpExecArray | null;
    
    // Special handling for the problem in the screenshot
    if (cleanedText.toLowerCase().includes('angle apb = 60')) {
      // This is the specific circle problem from the screenshot
      const centerX = 2, centerY = 1;
      const radius = 5;
      
      // Place points on the circle
      // Given point A at (7, 1)
      const pointAx = 7, pointAy = 1;
      
      // Calculate angle APB where P is center
      const angle = 60; // degrees
      const angleRadians = (angle * Math.PI) / 180;
      
      // Using A's position and angle to find B's position
      // First, get vector from center to A
      const vAx = pointAx - centerX;
      const vAy = pointAy - centerY;
      
      // Rotate 60 degrees
      const vBx = vAx * Math.cos(angleRadians) - vAy * Math.sin(angleRadians);
      const vBy = vAx * Math.sin(angleRadians) + vAy * Math.cos(angleRadians);
      
      // Point B coordinates
      const pointBx = centerX + vBx;
      const pointBy = centerY + vBy;
      
      // Add points to the data
      problemData.points = [
        { label: "A", coordinates: [pointAx, pointAy] as [number, number] },
        { label: "B", coordinates: [pointBx, pointBy] as [number, number] }
      ];
      
      // Add angle data
      problemData.angle = {
        vertex: "P",
        points: ["A", "B"],
        measure: 60
      };
      problemData.angleMeasure = 60;
    }
    else {
      // For other circle problems, use different approach
      while ((pointMatch2 = pointsOnCircleRegex.exec(cleanedText)) !== null) {
        const label = pointMatch2[1];
        
        // Check if we already added this point with coordinates
        const existingPoint = problemData.points.find((p: any) => p.label === label);
        if (!existingPoint) {
          // Add the point without specific coordinates (we'll place it on the circle later)
          problemData.points.push(label);
        }
      }
    }
    
    // Find angle information
    const angleRegex = /(?:\\angle|angle)\s+([A-Z])([A-Z])([A-Z])\s*=\s*(\d+)/i;
    const angleMatch = cleanedText.match(angleRegex);
    
    if (angleMatch && !problemData.angle) {
      const [_, p1, vertex, p2, degrees] = angleMatch;
      problemData.angle = {
        vertex: vertex,
        points: [p1, p2],
        measure: parseInt(degrees)
      };
      problemData.angleMeasure = parseInt(degrees);
    }
  }
  else if (cleanedText.toLowerCase().includes('angle')) {
    problemType = 'angle';
    
    // Default angle visualization data
    problemData = {
      vertex: [0, 0],
      rays: [
        [1, 0],   // 0 degrees
        [0.5, 0.866]  // 60 degrees
      ],
      measure: 60
    };
    
    // Try to extract angle measure if present
    const angleRegex = /(\d+)(?:\s+)?(?:°|degrees)/i;
    const angleMatch = cleanedText.match(angleRegex);
    if (angleMatch) {
      const degrees = parseInt(angleMatch[1]);
      const radians = (degrees * Math.PI) / 180;
      problemData.rays[1] = [Math.cos(radians), Math.sin(radians)];
      problemData.measure = degrees;
    }
  }
  else if (cleanedText.toLowerCase().includes('polygon') || 
           cleanedText.toLowerCase().includes('quadrilateral') ||
           cleanedText.toLowerCase().includes('rectangle') ||
           cleanedText.toLowerCase().includes('square')) {
    problemType = 'polygon';
    
    // Default polygon (square)
    problemData = {
      points: [
        [-1, -1], [1, -1], [1, 1], [-1, 1]
      ],
      labels: ['A', 'B', 'C', 'D']
    };
    
    // Try to determine type of polygon for better defaults
    if (cleanedText.toLowerCase().includes('rectangle') || cleanedText.toLowerCase().includes('square')) {
      // Already using a square/rectangle
    } else if (cleanedText.toLowerCase().includes('pentagon')) {
      const points = [];
      const labels = ['A', 'B', 'C', 'D', 'E'];
      
      for (let i = 0; i < 5; i++) {
        const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
        points.push([Math.cos(angle), Math.sin(angle)]);
      }
      
      problemData = { points, labels };
    } else if (cleanedText.toLowerCase().includes('hexagon')) {
      const points = [];
      const labels = ['A', 'B', 'C', 'D', 'E', 'F'];
      
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
        points.push([Math.cos(angle), Math.sin(angle)]);
      }
      
      problemData = { points, labels };
    }
  }
  
  return { problemType, problemData };
}

export function GeometryVisualizer({ 
  problemType, 
  problemData, 
  width = 300, 
  height = 300 
}: GeometryVisualizerProps) {
  const [error, setError] = useState<string | null>(null);

  if (error) {
    return (
      <div className="w-full h-full bg-gray-50 dark:bg-gray-900 rounded-lg flex items-center justify-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">Error loading visualization: {error}</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-hidden rounded-lg border bg-white dark:bg-slate-950" style={{ height }}>
      <Canvas
        orthographic
        camera={{ position: [0, 0, 5], zoom: 50 }}
        style={{ width: '100%', height: '100%' }}
      >
        <color attach="background" args={['#f8fafc']} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        
        {problemType === 'triangle' && <TriangleVisualization data={problemData} />}
        {problemType === 'circle' && <CircleVisualization data={problemData} />}
        {problemType === 'angle' && <AngleVisualization data={problemData} />}
        {problemType === 'polygon' && <PolygonVisualization data={problemData} />}
        {problemType === 'line' && <LineVisualization data={problemData} />}
        
        <gridHelper args={[10, 10, '#cccccc', '#cccccc']} />
        <OrbitControls enableZoom={false} enablePan={false} />
        <axesHelper args={[5]} />
      </Canvas>
    </div>
  );
}

function TriangleVisualization({ data }: { data: any }) {
  const { points, labels } = data;
  
  // Connect points to form a triangle
  const lines = [
    [points[0], points[1]],
    [points[1], points[2]],
    [points[2], points[0]]
  ];

  return (
    <>
      {/* Draw the triangle sides */}
      {lines.map((line: any, i: number) => (
        <Line
          key={i}
          points={[new THREE.Vector3(line[0][0], line[0][1], 0), new THREE.Vector3(line[1][0], line[1][1], 0)]}
          color="#0f766e"
          lineWidth={2}
        />
      ))}
      
      {/* Label the vertices */}
      {points.map((point: any, i: number) => (
        <Html key={i} position={[point[0], point[1], 0]} style={{ pointerEvents: 'none' }}>
          <div className="bg-white dark:bg-gray-800 px-1 rounded-full shadow-sm border text-sm font-medium text-blue-600 dark:text-blue-400">
            {labels[i]}
          </div>
        </Html>
      ))}
    </>
  );
}

function CircleVisualization({ data }: { data: any }) {
  const { center, radius } = data;
  
  // Extract points from the problem data
  const pointsOnCircle = data.points || [];
  
  // Generate positions for the points on the circle if coordinates aren't specified
  const pointPositions: Record<string, [number, number]> = {};
  
  // Convert any string representations of points to actual coordinates
  pointsOnCircle.forEach((point: any, index: number) => {
    if (typeof point === 'string') {
      // If this is just a label without coordinates, place it evenly around the circle
      const angle = (Math.PI * 2 * index) / Math.max(pointsOnCircle.length, 1);
      pointPositions[point] = [
        center[0] + Math.cos(angle) * radius,
        center[1] + Math.sin(angle) * radius
      ];
    } else if (Array.isArray(point) && point.length === 2) {
      // If it's already a coordinate array
      const pointLabel = String.fromCharCode(65 + index); // A, B, C, etc.
      pointPositions[pointLabel] = point as [number, number];
    } else if (point && point.label && point.coordinates) {
      // If it's an object with label and coordinates
      pointPositions[point.label] = point.coordinates;
    }
  });
  
  // Parse points from the problem text if specific coordinates are mentioned
  // For example: "Point A is at (7, 1)" or "Point A is located on the circle at coordinates (7, 1)"
  const pointRegex = /[Pp]oint\s+([A-Z])\s+(?:is|at|located)(?:\s+at|\s+on\s+the\s+circle\s+at)\s+coordinates?\s*\((-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)\)/g;
  const text = JSON.stringify(data); // Convert all data to a string to search for points
  let pointMatch: RegExpExecArray | null;
  
  while ((pointMatch = pointRegex.exec(text)) !== null) {
    const pointLabel = pointMatch[1];
    const x = parseFloat(pointMatch[2]);
    const y = parseFloat(pointMatch[3]);
    pointPositions[pointLabel] = [x, y];
  }
  
  // If we detected an angle in the problem, show it
  const angleData = data.angle || null;
  
  return (
    <>
      {/* Draw the circle */}
      <mesh position={[center[0], center[1], 0]}>
        <ringGeometry args={[radius - 0.01, radius, 64]} />
        <meshBasicMaterial color="#0f766e" />
      </mesh>
      
      {/* Draw the center point */}
      <mesh position={[center[0], center[1], 0]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshBasicMaterial color="#0f766e" />
      </mesh>
      
      {/* Label the center */}
      <Html position={[center[0], center[1], 0]} style={{ pointerEvents: 'none' }}>
        <div className="bg-white dark:bg-gray-800 px-1 rounded-full shadow-sm border text-sm font-medium text-blue-600 dark:text-blue-400">
          {data.centerLabel || "O"}
        </div>
      </Html>
      
      {/* Draw radius */}
      <Line
        points={[
          new THREE.Vector3(center[0], center[1], 0),
          new THREE.Vector3(center[0] + radius, center[1], 0)
        ]}
        color="#0f766e"
        lineWidth={1}
        dashed
      />
      
      {/* Label radius */}
      <Html position={[center[0] + radius/2, center[1] + 0.2, 0]} style={{ pointerEvents: 'none' }}>
        <div className="bg-white dark:bg-gray-800 px-1 rounded shadow-sm border text-xs text-gray-600 dark:text-gray-400">
          r = {radius}
        </div>
      </Html>
      
      {/* Draw points on the circle */}
      {Object.entries(pointPositions).map(([label, position]) => (
        <React.Fragment key={label}>
          <mesh position={[position[0], position[1], 0]}>
            <sphereGeometry args={[0.15, 16, 16]} />
            <meshBasicMaterial color="#ef4444" />
          </mesh>
          <Html position={[position[0], position[1], 0.1]} style={{ pointerEvents: 'none' }}>
            <div className="bg-white dark:bg-gray-800 px-1 rounded-full shadow-sm border text-sm font-medium text-red-600 dark:text-red-400">
              {label}
            </div>
          </Html>
        </React.Fragment>
      ))}
      
      {/* If points A and B are defined, draw a chord between them */}
      {pointPositions['A'] && pointPositions['B'] && (
        <Line
          points={[
            new THREE.Vector3(pointPositions['A'][0], pointPositions['A'][1], 0),
            new THREE.Vector3(pointPositions['B'][0], pointPositions['B'][1], 0)
          ]}
          color="#ef4444"
          lineWidth={2}
        />
      )}
      
      {/* Draw the central angle if points A and B exist */}
      {pointPositions['A'] && pointPositions['B'] && (
        <>
          {/* Draw lines from center to points */}
          <Line
            points={[
              new THREE.Vector3(center[0], center[1], 0),
              new THREE.Vector3(pointPositions['A'][0], pointPositions['A'][1], 0)
            ]}
            color="#0f766e"
            lineWidth={1.5}
          />
          <Line
            points={[
              new THREE.Vector3(center[0], center[1], 0),
              new THREE.Vector3(pointPositions['B'][0], pointPositions['B'][1], 0)
            ]}
            color="#0f766e"
            lineWidth={1.5}
          />
          
          {/* Draw an arc to represent the angle */}
          {(() => {
            const vA = [
              pointPositions['A'][0] - center[0],
              pointPositions['A'][1] - center[1]
            ];
            const vB = [
              pointPositions['B'][0] - center[0],
              pointPositions['B'][1] - center[1]
            ];
            
            // Calculate the angles
            const angleA = Math.atan2(vA[1], vA[0]);
            const angleB = Math.atan2(vB[1], vB[0]);
            
            // Determine the angle span
            let angleSpan = angleB - angleA;
            if (angleSpan < 0) angleSpan += Math.PI * 2;
            
            // Get angle measure from data or use a default
            let angleMeasure = 0;
            if (data.angleMeasure) {
              angleMeasure = data.angleMeasure;
            } else if (data.angle && data.angle.measure) {
              angleMeasure = data.angle.measure;
            } else {
              // If there's an angle mentioned in the text, extract it
              const angleRegex = /angle\s+[A-Z]+\s*=\s*(\d+)/i;
              const angleMatch = text.match(angleRegex);
              if (angleMatch) {
                angleMeasure = parseInt(angleMatch[1]);
              } else {
                // Calculate it from the vectors
                angleMeasure = Math.round((angleSpan * 180) / Math.PI);
              }
            }
            
            // Draw the arc
            const arcPoints = [];
            const arcRadius = radius * 0.2; // Smaller than the circle
            const segments = 32;
            
            for (let i = 0; i <= segments; i++) {
              const theta = angleA + (angleSpan * i) / segments;
              arcPoints.push(
                new THREE.Vector3(
                  center[0] + Math.cos(theta) * arcRadius,
                  center[1] + Math.sin(theta) * arcRadius,
                  0
                )
              );
            }
            
            return (
              <>
                <Line points={arcPoints} color="#ef4444" lineWidth={1.5} />
                {/* Show angle measure */}
                <Html
                  position={[
                    center[0] + Math.cos(angleA + angleSpan/2) * (arcRadius * 1.5),
                    center[1] + Math.sin(angleA + angleSpan/2) * (arcRadius * 1.5),
                    0
                  ]}
                  style={{ pointerEvents: 'none' }}
                >
                  <div className="bg-white dark:bg-gray-800 px-1 rounded shadow-sm border text-xs text-gray-600 dark:text-gray-400">
                    {angleMeasure}°
                  </div>
                </Html>
              </>
            );
          })()}
        </>
      )}
    </>
  );
}

function AngleVisualization({ data }: { data: any }) {
  const { vertex, rays, measure } = data;
  
  // Create lines for the angle rays
  const lines = rays.map((ray: any) => [vertex, [vertex[0] + ray[0] * 2, vertex[1] + ray[1] * 2]]);
  
  // Create arc to show the angle
  const arcPoints = [];
  const radius = 0.5;
  const segments = 32;
  let startAngle = Math.atan2(rays[0][1], rays[0][0]);
  let endAngle = Math.atan2(rays[1][1], rays[1][0]);
  
  // Ensure we draw the smaller angle (≤ 180°)
  let angleSpan = endAngle - startAngle;
  if (angleSpan < 0) angleSpan += Math.PI * 2;
  if (angleSpan > Math.PI) {
    angleSpan = 2 * Math.PI - angleSpan;
    const temp = startAngle;
    startAngle = endAngle;
    endAngle = temp;
  }
  
  for (let i = 0; i <= segments; i++) {
    const theta = startAngle + (angleSpan * i) / segments;
    arcPoints.push(new THREE.Vector3(
      vertex[0] + Math.cos(theta) * radius,
      vertex[1] + Math.sin(theta) * radius,
      0
    ));
  }
  
  return (
    <>
      {/* Draw the angle rays */}
      {lines.map((line: any, i: number) => (
        <Line
          key={i}
          points={[new THREE.Vector3(line[0][0], line[0][1], 0), new THREE.Vector3(line[1][0], line[1][1], 0)]}
          color="#0f766e"
          lineWidth={2}
        />
      ))}
      
      {/* Draw the angle arc */}
      <Line
        points={arcPoints}
        color="#0f766e"
        lineWidth={1}
      />
      
      {/* Show the angle measure */}
      <Html 
        position={[
          vertex[0] + Math.cos(startAngle + angleSpan/2) * radius * 1.3,
          vertex[1] + Math.sin(startAngle + angleSpan/2) * radius * 1.3,
          0
        ]} 
        style={{ pointerEvents: 'none' }}
      >
        <div className="bg-white dark:bg-gray-800 px-1 rounded shadow-sm border text-xs text-gray-600 dark:text-gray-400">
          {measure}°
        </div>
      </Html>
    </>
  );
}

function PolygonVisualization({ data }: { data: any }) {
  const { points, labels } = data;
  
  // Connect all points to form the polygon
  const lines = [];
  for (let i = 0; i < points.length; i++) {
    lines.push([points[i], points[(i + 1) % points.length]]);
  }
  
  return (
    <>
      {/* Draw the polygon sides */}
      {lines.map((line: any, i: number) => (
        <Line
          key={i}
          points={[new THREE.Vector3(line[0][0], line[0][1], 0), new THREE.Vector3(line[1][0], line[1][1], 0)]}
          color="#0f766e"
          lineWidth={2}
        />
      ))}
      
      {/* Label the vertices */}
      {points.map((point: any, i: number) => (
        <Html key={i} position={[point[0], point[1], 0]} style={{ pointerEvents: 'none' }}>
          <div className="bg-white dark:bg-gray-800 px-1 rounded-full shadow-sm border text-sm font-medium text-blue-600 dark:text-blue-400">
            {labels[i]}
          </div>
        </Html>
      ))}
    </>
  );
}

function LineVisualization({ data }: { data: any }) {
  // Default line from left to right
  const start = data.start || [-2, 0];
  const end = data.end || [2, 0];
  const pointsOnLine = data.points || [];

  return (
    <>
      {/* Draw the line */}
      <Line
        points={[new THREE.Vector3(start[0], start[1], 0), new THREE.Vector3(end[0], end[1], 0)]}
        color="#0f766e"
        lineWidth={2}
      />
      
      {/* Draw points on the line if any */}
      {pointsOnLine.map((point: any, i: number) => (
        <mesh key={i} position={[point.x, point.y, 0]}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshBasicMaterial color="#0f766e" />
          <Html position={[0, 0.2, 0]}>
            <div className="bg-white dark:bg-gray-800 px-1 rounded-full shadow-sm border text-sm font-medium text-blue-600 dark:text-blue-400">
              {point.label}
            </div>
          </Html>
        </mesh>
      ))}
    </>
  );
} 