"use client";

import { Float, Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import { useEffect, useRef, type ReactNode } from "react";
import { Group, MathUtils } from "three";
import { ServiceTooltip } from "@/components/three/ServiceTooltip";
import type {
  ServiceCategoryMapKey,
  ServiceCategoryTarget,
} from "@/lib/constants/service-category-map";

type InteractiveServiceObjectProps = {
  activeServiceId: ServiceCategoryMapKey | null;
  children: ReactNode;
  hitRadius?: number;
  index: number;
  onHoverChange: (target: ServiceCategoryTarget | null) => void;
  onSelect: (target: ServiceCategoryTarget) => void;
  position: [number, number, number];
  reducedMotion: boolean;
  rotation?: [number, number, number];
  scale?: number;
  selectedServiceId: ServiceCategoryMapKey | null;
  target: ServiceCategoryTarget;
  tooltipOffset?: [number, number, number];
};

function setDocumentCursor(cursor: "auto" | "pointer") {
  if (typeof document !== "undefined") {
    document.body.style.cursor = cursor;
  }
}

export function InteractiveServiceObject({
  activeServiceId,
  children,
  hitRadius = 0.48,
  index,
  onHoverChange,
  onSelect,
  position,
  reducedMotion,
  rotation = [0, 0, 0],
  scale = 1,
  selectedServiceId,
  target,
  tooltipOffset = [0, hitRadius + 0.24, 0],
}: InteractiveServiceObjectProps) {
  const groupRef = useRef<Group>(null);
  const isActive = activeServiceId === target.id;
  const isSelected = selectedServiceId === target.id;

  useEffect(() => {
    const group = groupRef.current;

    if (group && reducedMotion) {
      group.scale.setScalar(isActive || isSelected ? scale * 1.015 : scale);
    }
  }, [isActive, isSelected, reducedMotion, scale]);

  useEffect(() => {
    return () => setDocumentCursor("auto");
  }, []);

  useFrame(() => {
    const group = groupRef.current;

    if (!group || reducedMotion) {
      return;
    }

    const targetScale = isActive || isSelected ? scale * 1.055 : scale;
    const nextScale = MathUtils.lerp(group.scale.x, targetScale, 0.14);

    group.scale.setScalar(nextScale);
  });

  function handleClick(event: ThreeEvent<MouseEvent>) {
    event.stopPropagation();
    onSelect(target);
  }

  function handlePointerOver(event: ThreeEvent<PointerEvent>) {
    event.stopPropagation();
    setDocumentCursor("pointer");
    onHoverChange(target);
  }

  function handlePointerOut(event: ThreeEvent<PointerEvent>) {
    event.stopPropagation();
    setDocumentCursor("auto");
    onHoverChange(null);
  }

  const content = (
    <group
      onClick={handleClick}
      onPointerOut={handlePointerOut}
      onPointerOver={handlePointerOver}
      position={position}
      ref={groupRef}
      rotation={rotation}
      scale={scale}
    >
      <mesh>
        <sphereGeometry args={[hitRadius, 18, 14]} />
        <meshBasicMaterial depthWrite={false} opacity={0} transparent />
      </mesh>

      {isActive || isSelected ? (
        <mesh renderOrder={-1}>
          <sphereGeometry args={[hitRadius * 0.94, 24, 16]} />
          <meshBasicMaterial
            color="#F97316"
            depthWrite={false}
            opacity={isSelected ? 0.2 : 0.14}
            transparent
            wireframe
          />
        </mesh>
      ) : null}

      {children}

      {isActive ? (
        <Html center distanceFactor={8} position={tooltipOffset} zIndexRange={[50, 0]}>
          <ServiceTooltip target={target} />
        </Html>
      ) : null}
    </group>
  );

  if (reducedMotion) {
    return content;
  }

  return (
    <Float
      floatIntensity={0.12}
      floatingRange={[-0.04, 0.05]}
      rotationIntensity={0.08}
      speed={0.75 + index * 0.08}
    >
      {content}
    </Float>
  );
}
