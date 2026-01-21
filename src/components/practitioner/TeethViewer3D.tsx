import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';

interface ToothProps {
  position: [number, number, number];
  toothNumber: number;
  hasAttachment: boolean;
  isUpper: boolean;
}

function Tooth({ position, toothNumber, hasAttachment, isUpper }: ToothProps) {
  // Different heights for different tooth types
  const getToothDimensions = (num: number): [number, number, number] => {
    const lastDigit = num % 10;
    if (lastDigit <= 2) return [0.35, 0.5, 0.25];
    if (lastDigit === 3) return [0.35, 0.55, 0.3];
    if (lastDigit <= 5) return [0.4, 0.45, 0.35];
    return [0.5, 0.4, 0.45];
  };

  const [width, height, depth] = getToothDimensions(toothNumber);

  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial
          color={hasAttachment ? '#10b981' : '#e2e8f0'}
          emissive={hasAttachment ? '#059669' : '#000000'}
          emissiveIntensity={hasAttachment ? 0.2 : 0}
        />
      </mesh>
      {hasAttachment && (
        <mesh position={[0, 0, depth / 2 + 0.05]}>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshStandardMaterial color="#059669" />
        </mesh>
      )}
      <Text
        position={[0, isUpper ? -height / 2 - 0.15 : height / 2 + 0.15, 0.2]}
        fontSize={0.12}
        color={hasAttachment ? '#10b981' : '#94a3b8'}
        anchorX="center"
        anchorY="middle"
      >
        {toothNumber.toString()}
      </Text>
    </group>
  );
}

interface TeethArchViewProps {
  attachmentTeeth: number[];
  isUpper: boolean;
}

function TeethArchView({ attachmentTeeth, isUpper }: TeethArchViewProps) {
  const teeth = [];
  const yOffset = isUpper ? 0.6 : -0.6;
  
  const rightQuadrant = isUpper ? 1 : 4;
  const leftQuadrant = isUpper ? 2 : 3;

  for (let i = 1; i <= 8; i++) {
    const toothNum = rightQuadrant * 10 + i;
    const angle = ((i - 0.5) / 8) * (Math.PI / 2.2);
    const radius = 2.0 + (i > 5 ? (i - 5) * 0.08 : 0);
    const x = Math.sin(angle) * radius;
    const z = -Math.cos(angle) * radius + 2.0;
    
    teeth.push({
      number: toothNum,
      position: [x, yOffset, z] as [number, number, number],
    });
  }

  for (let i = 1; i <= 8; i++) {
    const toothNum = leftQuadrant * 10 + i;
    const angle = ((i - 0.5) / 8) * (Math.PI / 2.2);
    const radius = 2.0 + (i > 5 ? (i - 5) * 0.08 : 0);
    const x = -Math.sin(angle) * radius;
    const z = -Math.cos(angle) * radius + 2.0;
    
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
          hasAttachment={attachmentTeeth.includes(tooth.number)}
          isUpper={isUpper}
        />
      ))}
    </group>
  );
}

interface TeethViewer3DProps {
  attachmentTeeth: number[];
}

export function TeethViewer3D({ attachmentTeeth }: TeethViewer3DProps) {
  if (!attachmentTeeth || attachmentTeeth.length === 0) {
    return (
      <div className="p-4 rounded-lg bg-secondary/50 text-center text-muted-foreground">
        Aucun taquet défini pour ce patient
      </div>
    );
  }

  const upperTeeth = attachmentTeeth.filter(t => t >= 11 && t <= 28);
  const lowerTeeth = attachmentTeeth.filter(t => t >= 31 && t <= 48);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          Taquets ({attachmentTeeth.length} dents)
        </span>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
            Avec taquet
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-slate-300"></span>
            Sans taquet
          </span>
        </div>
      </div>
      
      <div className="h-[200px] w-full rounded-lg border border-border bg-gradient-to-b from-slate-900 to-slate-800 overflow-hidden">
        <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
          <ambientLight intensity={0.7} />
          <directionalLight position={[5, 5, 5]} intensity={0.6} />
          <directionalLight position={[-5, 5, 5]} intensity={0.3} />
          
          <TeethArchView attachmentTeeth={attachmentTeeth} isUpper={true} />
          <TeethArchView attachmentTeeth={attachmentTeeth} isUpper={false} />
          
          <OrbitControls
            enablePan={false}
            enableZoom={true}
            minDistance={3}
            maxDistance={8}
            minPolarAngle={Math.PI / 4}
            maxPolarAngle={Math.PI * 3 / 4}
          />
        </Canvas>
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-xs">
        {upperTeeth.length > 0 && (
          <div className="p-2 rounded bg-secondary/50">
            <span className="font-medium">Arcade supérieure: </span>
            <span className="text-muted-foreground">{upperTeeth.join(', ')}</span>
          </div>
        )}
        {lowerTeeth.length > 0 && (
          <div className="p-2 rounded bg-secondary/50">
            <span className="font-medium">Arcade inférieure: </span>
            <span className="text-muted-foreground">{lowerTeeth.join(', ')}</span>
          </div>
        )}
      </div>
    </div>
  );
}
