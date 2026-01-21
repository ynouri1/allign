import React, { useState, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';

// FDI tooth numbering system
// Upper right: 18-11, Upper left: 21-28
// Lower left: 38-31, Lower right: 41-48

interface ToothProps {
  position: [number, number, number];
  toothNumber: number;
  isSelected: boolean;
  onToggle: (toothNumber: number) => void;
  isUpper: boolean;
}

function Tooth({ position, toothNumber, isSelected, onToggle, isUpper }: ToothProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  // Different heights for different tooth types
  const getToothDimensions = (num: number): [number, number, number] => {
    const lastDigit = num % 10;
    // Incisors (1-2)
    if (lastDigit <= 2) return [0.35, 0.5, 0.25];
    // Canines (3)
    if (lastDigit === 3) return [0.35, 0.55, 0.3];
    // Premolars (4-5)
    if (lastDigit <= 5) return [0.4, 0.45, 0.35];
    // Molars (6-8)
    return [0.5, 0.4, 0.45];
  };

  const [width, height, depth] = getToothDimensions(toothNumber);

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onToggle(toothNumber);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
      >
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial
          color={isSelected ? '#10b981' : hovered ? '#60a5fa' : '#f1f5f9'}
          emissive={isSelected ? '#059669' : hovered ? '#3b82f6' : '#000000'}
          emissiveIntensity={isSelected ? 0.3 : hovered ? 0.2 : 0}
        />
      </mesh>
      <Text
        position={[0, isUpper ? -height / 2 - 0.2 : height / 2 + 0.2, 0.3]}
        fontSize={0.18}
        color={isSelected ? '#10b981' : '#64748b'}
        anchorX="center"
        anchorY="middle"
      >
        {toothNumber.toString()}
      </Text>
    </group>
  );
}

interface TeethArchProps {
  selectedTeeth: number[];
  onToggle: (toothNumber: number) => void;
  isUpper: boolean;
}

function TeethArch({ selectedTeeth, onToggle, isUpper }: TeethArchProps) {
  // Generate teeth positions in an arch shape
  const teeth = [];
  const yOffset = isUpper ? 0.8 : -0.8;
  
  // Right side (quadrant 1 for upper, 4 for lower)
  const rightQuadrant = isUpper ? 1 : 4;
  // Left side (quadrant 2 for upper, 3 for lower)
  const leftQuadrant = isUpper ? 2 : 3;

  // Create teeth for right side (from center to right)
  for (let i = 1; i <= 8; i++) {
    const toothNum = rightQuadrant * 10 + i;
    const angle = ((i - 0.5) / 8) * (Math.PI / 2.2);
    const radius = 2.5 + (i > 5 ? (i - 5) * 0.1 : 0);
    const x = Math.sin(angle) * radius;
    const z = -Math.cos(angle) * radius + 2.5;
    
    teeth.push({
      number: toothNum,
      position: [x, yOffset, z] as [number, number, number],
    });
  }

  // Create teeth for left side (from center to left)
  for (let i = 1; i <= 8; i++) {
    const toothNum = leftQuadrant * 10 + i;
    const angle = ((i - 0.5) / 8) * (Math.PI / 2.2);
    const radius = 2.5 + (i > 5 ? (i - 5) * 0.1 : 0);
    const x = -Math.sin(angle) * radius;
    const z = -Math.cos(angle) * radius + 2.5;
    
    teeth.push({
      number: toothNum,
      position: [x, yOffset, z] as [number, number, number],
    });
  }

  return (
    <group>
      {teeth.map((tooth) => (
        <Tooth
          key={tooth.number}
          position={tooth.position}
          toothNumber={tooth.number}
          isSelected={selectedTeeth.includes(tooth.number)}
          onToggle={onToggle}
          isUpper={isUpper}
        />
      ))}
    </group>
  );
}

function Gums() {
  return (
    <group>
      {/* Upper gum */}
      <mesh position={[0, 0.6, 0.8]} rotation={[0.3, 0, 0]}>
        <torusGeometry args={[2.2, 0.4, 8, 32, Math.PI]} />
        <meshStandardMaterial color="#ffb6c1" transparent opacity={0.6} />
      </mesh>
      {/* Lower gum */}
      <mesh position={[0, -0.6, 0.8]} rotation={[-0.3, Math.PI, 0]}>
        <torusGeometry args={[2.2, 0.4, 8, 32, Math.PI]} />
        <meshStandardMaterial color="#ffb6c1" transparent opacity={0.6} />
      </mesh>
    </group>
  );
}

interface TeethSelector3DProps {
  selectedTeeth: number[];
  onTeethChange: (teeth: number[]) => void;
}

export function TeethSelector3D({ selectedTeeth, onTeethChange }: TeethSelector3DProps) {
  const handleToggle = (toothNumber: number) => {
    if (selectedTeeth.includes(toothNumber)) {
      onTeethChange(selectedTeeth.filter((t) => t !== toothNumber));
    } else {
      onTeethChange([...selectedTeeth, toothNumber].sort((a, b) => a - b));
    }
  };

  const selectAllUpper = () => {
    const upperTeeth = [11, 12, 13, 14, 15, 16, 17, 18, 21, 22, 23, 24, 25, 26, 27, 28];
    const current = new Set(selectedTeeth);
    const allUpperSelected = upperTeeth.every((t) => current.has(t));
    
    if (allUpperSelected) {
      onTeethChange(selectedTeeth.filter((t) => !upperTeeth.includes(t)));
    } else {
      onTeethChange([...new Set([...selectedTeeth, ...upperTeeth])].sort((a, b) => a - b));
    }
  };

  const selectAllLower = () => {
    const lowerTeeth = [31, 32, 33, 34, 35, 36, 37, 38, 41, 42, 43, 44, 45, 46, 47, 48];
    const current = new Set(selectedTeeth);
    const allLowerSelected = lowerTeeth.every((t) => current.has(t));
    
    if (allLowerSelected) {
      onTeethChange(selectedTeeth.filter((t) => !lowerTeeth.includes(t)));
    } else {
      onTeethChange([...new Set([...selectedTeeth, ...lowerTeeth])].sort((a, b) => a - b));
    }
  };

  const clearAll = () => {
    onTeethChange([]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">
          Dents avec taquets ({selectedTeeth.length} sélectionnées)
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={selectAllUpper}
            className="text-xs px-2 py-1 bg-secondary text-secondary-foreground rounded hover:bg-secondary/80"
          >
            Arcade sup.
          </button>
          <button
            type="button"
            onClick={selectAllLower}
            className="text-xs px-2 py-1 bg-secondary text-secondary-foreground rounded hover:bg-secondary/80"
          >
            Arcade inf.
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="text-xs px-2 py-1 bg-destructive/10 text-destructive rounded hover:bg-destructive/20"
          >
            Effacer
          </button>
        </div>
      </div>
      
      <div className="h-[300px] w-full rounded-lg border border-border bg-gradient-to-b from-slate-900 to-slate-800 overflow-hidden">
        <Canvas camera={{ position: [0, 0, 6], fov: 50 }}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 5, 5]} intensity={0.8} />
          <directionalLight position={[-5, 5, 5]} intensity={0.4} />
          
          <Gums />
          <TeethArch selectedTeeth={selectedTeeth} onToggle={handleToggle} isUpper={true} />
          <TeethArch selectedTeeth={selectedTeeth} onToggle={handleToggle} isUpper={false} />
          
          <OrbitControls
            enablePan={false}
            enableZoom={true}
            minDistance={4}
            maxDistance={10}
            minPolarAngle={Math.PI / 4}
            maxPolarAngle={Math.PI * 3 / 4}
          />
        </Canvas>
      </div>
      
      {selectedTeeth.length > 0 && (
        <div className="text-xs text-muted-foreground">
          <span className="font-medium">Sélection: </span>
          {selectedTeeth.join(', ')}
        </div>
      )}
    </div>
  );
}
