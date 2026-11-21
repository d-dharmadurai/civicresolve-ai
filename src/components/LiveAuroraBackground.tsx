import { useEffect, useRef } from "react";

interface ParticleNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  color: string;
  pulseOffset: number;
}

const NODE_COLORS = [
  "96, 165, 250", // Electric blue
  "129, 140, 248", // Royal indigo
  "45, 212, 191", // Subtle teal
  "251, 191, 36", // Warm amber accent
];

export function LiveAuroraBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let ctx: CanvasRenderingContext2D | null = null;
    try {
      ctx = canvas.getContext("2d");
    } catch {
      return;
    }
    if (!ctx) return;

    const prefersReducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = window.innerWidth || 1440;
    let height = window.innerHeight || 900;
    let animationFrameId = 0;

    const resizeCanvas = () => {
      width = window.innerWidth || 1440;
      height = window.innerHeight || 900;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resizeCanvas();

    const particleCount = Math.min(58, Math.max(28, Math.floor((width * height) / 28000)));
    const nodes: ParticleNode[] = Array.from({ length: particleCount }, (_, idx) => {
      const color =
        idx % 11 === 0
          ? NODE_COLORS[3]
          : idx % 4 === 0
            ? NODE_COLORS[2]
            : idx % 2 === 0
              ? NODE_COLORS[0]
              : NODE_COLORS[1];

      return {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.28,
        vy: (Math.random() - 0.5) * 0.24,
        radius: 1.1 + Math.random() * 1.9,
        alpha: 0.28 + Math.random() * 0.42,
        color,
        pulseOffset: Math.random() * Math.PI * 2,
      };
    });

    const maxLinkDistance = 145;

    const renderFrame = (timeMs: number) => {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);

      const t = timeMs * 0.0012;

      // Update positions & draw ambient glowing particles
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (!prefersReducedMotion) {
          node.x += node.vx;
          node.y += node.vy;

          if (node.x < -20) node.x = width + 20;
          if (node.x > width + 20) node.x = -20;
          if (node.y < -20) node.y = height + 20;
          if (node.y > height + 20) node.y = -20;
        }

        const pulse = 0.8 + 0.2 * Math.sin(t + node.pulseOffset);
        const nodeAlpha = node.alpha * pulse;

        // Soft outer glow
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * 3.1, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${node.color}, ${nodeAlpha * 0.16})`;
        ctx.fill();

        // Crisp glowing core
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${node.color}, ${nodeAlpha})`;
        ctx.fill();
      }

      // Draw delicate smart-city constellation lines between nearby nodes
      ctx.lineWidth = 0.7;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const distSq = dx * dx + dy * dy;
          if (distSq < maxLinkDistance * maxLinkDistance) {
            const dist = Math.sqrt(distSq);
            const lineAlpha = (1 - dist / maxLinkDistance) * 0.14;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(147, 197, 253, ${lineAlpha.toFixed(3)})`;
            ctx.stroke();
          }
        }
      }

      if (!prefersReducedMotion) {
        animationFrameId = window.requestAnimationFrame(renderFrame);
      }
    };

    renderFrame(0);

    // Coalesce bursts of resize events into one canvas resize per animation frame.
    let resizeFrameId = 0;
    const onResize = () => {
      if (resizeFrameId) return;
      resizeFrameId = window.requestAnimationFrame(() => {
        resizeFrameId = 0;
        resizeCanvas();
      });
    };

    // Stop animating while the tab is hidden to save CPU/battery; resume on return.
    const onVisibilityChange = () => {
      if (prefersReducedMotion) return;
      if (document.hidden) {
        window.cancelAnimationFrame(animationFrameId);
        animationFrameId = 0;
      } else if (!animationFrameId) {
        animationFrameId = window.requestAnimationFrame(renderFrame);
      }
    };

    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.cancelAnimationFrame(animationFrameId);
      window.cancelAnimationFrame(resizeFrameId);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#060B19]"
    >
      {/* Slow-drifting CSS animated gradient aurora mesh */}
      <div className="aurora-base-gradient absolute inset-0 opacity-95" />

      {/* Royal indigo & electric blue aurora bloom */}
      <div
        className="aurora-orb-indigo absolute -top-1/4 -left-1/6 h-[72vh] w-[72vw] rounded-full blur-3xl opacity-75"
        style={{
          background:
            "radial-gradient(circle at center, rgba(30, 27, 75, 0.85) 0%, rgba(15, 41, 74, 0.45) 48%, transparent 75%)",
        }}
      />

      {/* Electric blue & subtle teal highlight aurora */}
      <div
        className="aurora-orb-blue-teal absolute top-1/4 -right-1/6 h-[68vh] w-[68vw] rounded-full blur-3xl opacity-75"
        style={{
          background:
            "radial-gradient(circle at center, rgba(15, 41, 74, 0.85) 0%, rgba(20, 184, 166, 0.18) 46%, transparent 74%)",
        }}
      />

      {/* Subtle warm amber & deep indigo lower ambient glow */}
      <div
        className="aurora-orb-amber absolute -bottom-1/4 left-1/4 h-[60vh] w-[64vw] rounded-full blur-3xl opacity-70"
        style={{
          background:
            "radial-gradient(circle at center, rgba(245, 158, 11, 0.14) 0%, rgba(30, 27, 75, 0.55) 45%, transparent 75%)",
        }}
      />

      {/* Lightweight 60fps HTML5 Canvas smart-city constellation layer */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 h-full w-full opacity-80"
      />
    </div>
  );
}
