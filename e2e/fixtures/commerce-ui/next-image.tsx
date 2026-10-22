import type { CSSProperties } from "react";
// eslint-disable-next-line @next/next/no-img-element -- Browser-only stand-in for Next Image in isolated component tests.
export default function Image({ src, alt, fill, width, height, style, className, sizes }: { src: string; alt: string; fill?: boolean; width?: number; height?: number; style?: CSSProperties; className?: string; sizes?: string }) { return <img src={src} alt={alt} width={width} height={height} sizes={sizes} className={className} style={{ ...(fill ? { position:"absolute",inset:0,width:"100%",height:"100%" } : {}), ...style }} />; }
