"use client";

import type { ReactNode } from "react";
import { InteractiveServiceObject } from "@/components/three/InteractiveServiceObject";
import {
  serviceCategoryMap,
  type ServiceCategoryMapKey,
  type ServiceCategoryTarget,
} from "@/lib/constants/service-category-map";

type ServiceObjectsProps = {
  activeServiceId: ServiceCategoryMapKey | null;
  onHoverChange: (target: ServiceCategoryTarget | null) => void;
  onSelect: (target: ServiceCategoryTarget) => void;
  reducedMotion: boolean;
  selectedServiceId: ServiceCategoryMapKey | null;
};

type ServiceNodeProps = {
  children: ReactNode;
  hitRadius?: number;
  index: number;
  isActiveServiceId: ServiceCategoryMapKey | null;
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

const colors = {
  cream: "#FFF3E8",
  green: "#14966C",
  metal: "#D8DEE8",
  navy: "#0A2540",
  orange: "#FF6500",
  orangeDark: "#E95C00",
  sky: "#BFE4F8",
  white: "#FFFFFF",
};

function RoomDivider({
  position,
  scale,
}: {
  position: [number, number, number];
  scale: [number, number, number];
}) {
  return (
    <mesh castShadow receiveShadow position={position}>
      <boxGeometry args={scale} />
      <meshStandardMaterial color="#E7E9EE" roughness={0.74} />
    </mesh>
  );
}

function WindowPane({
  position,
  scale,
}: {
  position: [number, number, number];
  scale: [number, number, number];
}) {
  return (
    <mesh castShadow position={position}>
      <boxGeometry args={scale} />
      <meshStandardMaterial color="#CBE4F2" metalness={0.02} roughness={0.24} />
    </mesh>
  );
}

function MiniBed({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow position={[0, 0.06, 0]}>
        <boxGeometry args={[0.58, 0.12, 0.42]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.62} />
      </mesh>
      <mesh castShadow position={[-0.16, 0.15, -0.1]}>
        <boxGeometry args={[0.22, 0.08, 0.18]} />
        <meshStandardMaterial color="#FFF2E8" roughness={0.7} />
      </mesh>
      <mesh castShadow position={[0.1, 0.16, 0.08]}>
        <boxGeometry args={[0.36, 0.06, 0.22]} />
        <meshStandardMaterial color="#EAF0F7" roughness={0.68} />
      </mesh>
    </group>
  );
}

function MiniSofa({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow position={[0, 0.1, 0]}>
        <boxGeometry args={[0.58, 0.18, 0.28]} />
        <meshStandardMaterial color="#DCE8F2" roughness={0.58} />
      </mesh>
      <mesh castShadow position={[0, 0.24, -0.12]}>
        <boxGeometry args={[0.58, 0.2, 0.08]} />
        <meshStandardMaterial color="#C8D8E5" roughness={0.6} />
      </mesh>
      <mesh castShadow position={[-0.27, 0.2, 0.01]}>
        <boxGeometry args={[0.08, 0.22, 0.28]} />
        <meshStandardMaterial color="#C8D8E5" roughness={0.62} />
      </mesh>
    </group>
  );
}

function MiniTable({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow position={[0, 0.16, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 0.08, 28]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.58} />
      </mesh>
      <mesh castShadow position={[0, -0.02, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.32, 16]} />
        <meshStandardMaterial color={colors.orange} roughness={0.48} />
      </mesh>
    </group>
  );
}

function MiniKitchen({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow position={[0, 0.12, 0]}>
        <boxGeometry args={[0.62, 0.22, 0.18]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.6} />
      </mesh>
      <mesh castShadow position={[-0.2, 0.26, 0.02]}>
        <boxGeometry args={[0.16, 0.16, 0.2]} />
        <meshStandardMaterial color="#EAF0F7" roughness={0.52} />
      </mesh>
      <mesh castShadow position={[0.21, 0.26, 0.02]}>
        <boxGeometry args={[0.2, 0.16, 0.2]} />
        <meshStandardMaterial color="#FFF2E8" roughness={0.54} />
      </mesh>
      <mesh castShadow position={[0.05, 0.34, 0.12]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.1, 0.02, 12, 20, Math.PI]} />
        <meshStandardMaterial color={colors.metal} metalness={0.14} roughness={0.36} />
      </mesh>
    </group>
  );
}

function MiniPlant({
  position,
  scale = 1,
}: {
  position: [number, number, number];
  scale?: number;
}) {
  return (
    <group position={position} scale={scale}>
      <mesh castShadow position={[0, 0.04, 0]}>
        <cylinderGeometry args={[0.08, 0.1, 0.14, 18]} />
        <meshStandardMaterial color={colors.orange} roughness={0.66} />
      </mesh>
      <mesh castShadow position={[0, 0.22, 0]}>
        <sphereGeometry args={[0.13, 18, 14]} />
        <meshStandardMaterial color="#4E9F7D" roughness={0.7} />
      </mesh>
    </group>
  );
}

function ServiceNode({
  children,
  hitRadius,
  index,
  isActiveServiceId,
  onHoverChange,
  onSelect,
  position,
  reducedMotion,
  rotation = [0, 0, 0],
  scale = 1,
  selectedServiceId,
  target,
  tooltipOffset,
}: ServiceNodeProps) {
  return (
    <InteractiveServiceObject
      activeServiceId={isActiveServiceId}
      hitRadius={hitRadius}
      index={index}
      onHoverChange={onHoverChange}
      onSelect={onSelect}
      position={position}
      reducedMotion={reducedMotion}
      rotation={rotation}
      scale={scale}
      selectedServiceId={selectedServiceId}
      target={target}
      tooltipOffset={tooltipOffset}
    >
      {children}
    </InteractiveServiceObject>
  );
}

export function HomeModel() {
  return (
    <group position={[0, -0.38, 0]} rotation={[0, -0.43, 0]} scale={1.12}>
      <mesh receiveShadow position={[0, -0.82, 0]}>
        <boxGeometry args={[3.28, 0.16, 2.26]} />
        <meshStandardMaterial color="#FFF2E8" roughness={0.82} />
      </mesh>

      <mesh castShadow receiveShadow position={[0, -0.48, 0]}>
        <boxGeometry args={[2.68, 0.16, 1.78]} />
        <meshStandardMaterial color={colors.white} roughness={0.68} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 0.19, 0]}>
        <boxGeometry args={[2.54, 0.14, 1.7]} />
        <meshStandardMaterial color={colors.white} roughness={0.68} />
      </mesh>

      <mesh castShadow receiveShadow position={[0, -0.1, -0.83]}>
        <boxGeometry args={[2.7, 1.34, 0.12]} />
        <meshStandardMaterial color="#F7F9FC" opacity={0.96} roughness={0.74} transparent />
      </mesh>
      <mesh castShadow receiveShadow position={[-1.32, -0.1, 0]}>
        <boxGeometry args={[0.12, 1.34, 1.72]} />
        <meshStandardMaterial color={colors.white} opacity={0.9} roughness={0.72} transparent />
      </mesh>
      <mesh castShadow receiveShadow position={[1.32, -0.1, 0]}>
        <boxGeometry args={[0.12, 1.34, 1.72]} />
        <meshStandardMaterial color={colors.white} opacity={0.9} roughness={0.72} transparent />
      </mesh>

      <RoomDivider position={[0, -0.12, -0.02]} scale={[0.08, 1.22, 1.58]} />
      <RoomDivider position={[0.72, -0.12, 0.01]} scale={[0.07, 1.18, 1.56]} />
      <RoomDivider position={[-0.72, -0.12, 0.01]} scale={[0.07, 1.18, 1.56]} />

      <group position={[0, 0.9, -0.18]}>
        <mesh castShadow position={[-0.48, 0, 0]} rotation={[0, 0, 0.42]}>
          <boxGeometry args={[1.48, 0.12, 1.86]} />
          <meshStandardMaterial color={colors.navy} roughness={0.62} />
        </mesh>
        <mesh castShadow position={[0.48, 0, 0]} rotation={[0, 0, -0.42]}>
          <boxGeometry args={[1.48, 0.12, 1.86]} />
          <meshStandardMaterial color={colors.navy} roughness={0.62} />
        </mesh>
      </group>
      <mesh castShadow position={[0.5, 1.14, -0.38]}>
        <boxGeometry args={[0.18, 0.42, 0.18]} />
        <meshStandardMaterial color={colors.white} roughness={0.68} />
      </mesh>

      <mesh castShadow position={[-0.98, -0.55, 0.9]}>
        <boxGeometry args={[0.32, 0.52, 0.08]} />
        <meshStandardMaterial color={colors.orange} roughness={0.58} />
      </mesh>
      <WindowPane position={[-0.45, -0.3, 0.91]} scale={[0.34, 0.3, 0.06]} />
      <WindowPane position={[0.34, -0.3, 0.91]} scale={[0.34, 0.3, 0.06]} />
      <WindowPane position={[0.98, 0.34, 0.86]} scale={[0.3, 0.26, 0.06]} />
      <WindowPane position={[-0.98, 0.34, 0.86]} scale={[0.3, 0.26, 0.06]} />

      <MiniSofa position={[-0.72, -0.32, 0.42]} />
      <MiniTable position={[-0.18, -0.42, 0.56]} />
      <MiniKitchen position={[0.82, -0.34, 0.42]} />
      <MiniBed position={[-0.78, 0.34, 0.42]} />
      <MiniBed position={[0.28, 0.34, 0.42]} />
      <MiniTable position={[0.88, 0.3, 0.52]} />
      <MiniPlant position={[-1.14, -0.72, 0.56]} scale={0.82} />
      <MiniPlant position={[1.08, -0.72, 0.5]} scale={0.76} />
      <MiniPlant position={[1.18, 0.07, 0.5]} scale={0.62} />
    </group>
  );
}

function KeyObject() {
  return (
    <group>
      <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.18, 0.04, 12, 28]} />
        <meshStandardMaterial color={colors.orange} roughness={0.42} />
      </mesh>
      <mesh castShadow position={[0.31, 0, 0]}>
        <boxGeometry args={[0.5, 0.07, 0.07]} />
        <meshStandardMaterial color={colors.orange} roughness={0.42} />
      </mesh>
      <mesh castShadow position={[0.57, -0.08, 0]}>
        <boxGeometry args={[0.08, 0.18, 0.07]} />
        <meshStandardMaterial color={colors.orangeDark} roughness={0.48} />
      </mesh>
    </group>
  );
}

function FurnitureObject() {
  return (
    <group rotation={[0, 0, -0.1]}>
      <mesh castShadow position={[0, 0.14, 0]}>
        <boxGeometry args={[0.58, 0.12, 0.38]} />
        <meshStandardMaterial color={colors.navy} roughness={0.62} />
      </mesh>
      <mesh castShadow position={[-0.2, -0.12, 0.1]}>
        <boxGeometry args={[0.08, 0.42, 0.08]} />
        <meshStandardMaterial color={colors.orange} roughness={0.52} />
      </mesh>
      <mesh castShadow position={[0.2, -0.12, 0.1]}>
        <boxGeometry args={[0.08, 0.42, 0.08]} />
        <meshStandardMaterial color={colors.orange} roughness={0.52} />
      </mesh>
      <mesh castShadow position={[0, -0.34, -0.13]}>
        <boxGeometry args={[0.5, 0.1, 0.08]} />
        <meshStandardMaterial color={colors.metal} metalness={0.08} roughness={0.38} />
      </mesh>
    </group>
  );
}

function PaintRollerObject() {
  return (
    <group>
      <mesh castShadow rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.13, 0.13, 0.58, 24]} />
        <meshStandardMaterial color={colors.orange} roughness={0.48} />
      </mesh>
      <mesh castShadow position={[0, -0.32, 0]}>
        <boxGeometry args={[0.08, 0.45, 0.08]} />
        <meshStandardMaterial color={colors.navy} roughness={0.6} />
      </mesh>
      <mesh castShadow position={[0.18, -0.55, 0]}>
        <boxGeometry args={[0.32, 0.08, 0.08]} />
        <meshStandardMaterial color={colors.metal} roughness={0.4} />
      </mesh>
    </group>
  );
}

function ElectricObject() {
  return (
    <group rotation={[0, 0, -0.2]}>
      <mesh castShadow position={[0, 0.18, 0]}>
        <boxGeometry args={[0.22, 0.5, 0.08]} />
        <meshStandardMaterial color={colors.orange} roughness={0.5} />
      </mesh>
      <mesh castShadow position={[0.12, -0.16, 0]}>
        <boxGeometry args={[0.22, 0.5, 0.08]} />
        <meshStandardMaterial color={colors.orangeDark} roughness={0.5} />
      </mesh>
    </group>
  );
}

function CleaningObject() {
  return (
    <group rotation={[0, 0, -0.32]}>
      <mesh castShadow position={[0, 0.15, 0]}>
        <boxGeometry args={[0.06, 0.75, 0.06]} />
        <meshStandardMaterial color={colors.navy} roughness={0.55} />
      </mesh>
      <mesh castShadow position={[0, -0.28, 0]}>
        <boxGeometry args={[0.45, 0.18, 0.18]} />
        <meshStandardMaterial color={colors.green} roughness={0.62} />
      </mesh>
    </group>
  );
}

function AirConditionerObject() {
  return (
    <group>
      <mesh castShadow>
        <boxGeometry args={[0.62, 0.34, 0.18]} />
        <meshStandardMaterial color={colors.white} roughness={0.62} />
      </mesh>
      <mesh castShadow position={[0, -0.08, 0.1]}>
        <boxGeometry args={[0.46, 0.05, 0.04]} />
        <meshStandardMaterial color={colors.sky} roughness={0.45} />
      </mesh>
      <mesh castShadow position={[0.22, 0.07, 0.1]}>
        <boxGeometry args={[0.08, 0.08, 0.04]} />
        <meshStandardMaterial color={colors.orange} roughness={0.45} />
      </mesh>
    </group>
  );
}

function PipeObject() {
  return (
    <group>
      <mesh castShadow rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.07, 0.07, 0.58, 18]} />
        <meshStandardMaterial color={colors.metal} metalness={0.08} roughness={0.38} />
      </mesh>
      <mesh castShadow position={[0.3, 0.15, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.15, 0.055, 12, 24, Math.PI]} />
        <meshStandardMaterial color={colors.metal} metalness={0.08} roughness={0.38} />
      </mesh>
    </group>
  );
}

export function ServiceObjects({
  activeServiceId,
  onHoverChange,
  onSelect,
  reducedMotion,
  selectedServiceId,
}: ServiceObjectsProps) {
  const nodes = [
    {
      component: <KeyObject />,
      hitRadius: 0.5,
      position: [-1.9, 0.68, 0.25] as [number, number, number],
      target: serviceCategoryMap.locksmith,
      tooltipOffset: [0, -0.74, 0] as [number, number, number],
    },
    {
      component: <FurnitureObject />,
      hitRadius: 0.54,
      position: [1.82, 0.56, -0.2] as [number, number, number],
      target: serviceCategoryMap["furniture-assembly"],
      tooltipOffset: [0, -0.78, 0] as [number, number, number],
    },
    {
      component: <PaintRollerObject />,
      hitRadius: 0.48,
      position: [-1.62, -0.75, -0.12] as [number, number, number],
      target: serviceCategoryMap.painting,
      tooltipOffset: [0, 0.72, 0] as [number, number, number],
    },
    {
      component: <ElectricObject />,
      hitRadius: 0.44,
      position: [1.5, -0.8, 0.32] as [number, number, number],
      target: serviceCategoryMap.electrical,
      tooltipOffset: [0, 0.68, 0] as [number, number, number],
    },
    {
      component: <CleaningObject />,
      hitRadius: 0.48,
      position: [-0.55, 1.14, -0.3] as [number, number, number],
      target: serviceCategoryMap.cleaning,
      tooltipOffset: [0, -0.72, 0] as [number, number, number],
    },
    {
      component: <AirConditionerObject />,
      hitRadius: 0.52,
      position: [0.72, 1.08, 0.15] as [number, number, number],
      target: serviceCategoryMap["climate-appliance-service"],
      tooltipOffset: [0, -0.76, 0] as [number, number, number],
    },
    {
      component: <PipeObject />,
      hitRadius: 0.5,
      position: [0.04, -1.3, 0.42] as [number, number, number],
      target: serviceCategoryMap.plumbing,
      tooltipOffset: [0, 0.74, 0] as [number, number, number],
    },
  ];

  return (
    <group>
      {nodes.map((node, index) => (
        <ServiceNode
          hitRadius={node.hitRadius}
          index={index}
          isActiveServiceId={activeServiceId}
          key={node.target.id}
          onHoverChange={onHoverChange}
          onSelect={onSelect}
          position={node.position}
          reducedMotion={reducedMotion}
          scale={0.88}
          selectedServiceId={selectedServiceId}
          target={node.target}
          tooltipOffset={node.tooltipOffset}
        >
          {node.component}
        </ServiceNode>
      ))}
    </group>
  );
}
