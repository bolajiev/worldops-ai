"use client";

import { useEffect, useMemo } from "react";
import { CanvasTexture, SRGBColorSpace } from "three";

type WorldLabelSpriteProps = {
  text: string;
  accent?: string;
  position: [number, number, number];
  scale?: [number, number, number];
};

export default function WorldLabelSprite({
  text,
  accent = "#63d2c9",
  position,
  scale = [11, 1.4, 1],
}: WorldLabelSpriteProps) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      const fallback = new CanvasTexture(canvas);
      fallback.colorSpace = SRGBColorSpace;
      return fallback;
    }

    const drawRoundedRect = (
      x: number,
      y: number,
      width: number,
      height: number,
      radius: number,
    ) => {
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      ctx.lineTo(x + radius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
    };

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawRoundedRect(5, 12, canvas.width - 10, canvas.height - 24, 20);
    ctx.fillStyle = "rgba(5, 16, 18, 0.9)";
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = accent;
    drawRoundedRect(28, 44, 12, 40, 6);
    ctx.fill();

    ctx.font = "600 44px ui-monospace, 'SFMono-Regular', Menlo, monospace";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#e9f5ef";
    const label = text.length > 34 ? `${text.slice(0, 33)}…` : text;
    ctx.fillText(label, 60, canvas.height / 2 + 2);

    const result = new CanvasTexture(canvas);
    result.colorSpace = SRGBColorSpace;
    result.anisotropy = 4;
    result.needsUpdate = true;
    return result;
  }, [text, accent]);

  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <sprite position={position} scale={scale} renderOrder={20}>
      <spriteMaterial
        map={texture}
        transparent
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
      />
    </sprite>
  );
}
