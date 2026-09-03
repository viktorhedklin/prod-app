import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';
import type { OrbNode, OrbEdge, OrbNodeType } from '../orbStore';

export interface OrbGraph3DProps {
  nodes: OrbNode[];
  edges: OrbEdge[];
  onSelect?: (node: OrbNode) => void;
  height?: number; // default 520
  centerLabel?: string;
  selectedNodeId?: string;
}

interface Node3DPos {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
}

interface ProjectedNode {
  node: OrbNode;
  sx: number;
  sy: number;
  sz: number;
  r: number;
  alpha: number;
  color: string;
}

interface ProjectedEdge {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  weight: number;
  alpha: number;
  isDirect: boolean;
  fromId: string;
  toId: string;
}

function getNodeColor(type: OrbNodeType, theme: Theme): string {
  switch (type) {
    case 'bybit':
      return theme.palette.primary.main; // #14B8A6 (Teal)
    case 'learned':
      return theme.palette.secondary.main; // #06B6D4 (Cyan)
    case 'memory':
      return theme.palette.info?.main || '#38BDF8'; // Sky Cyan
    case 'insight':
      return theme.palette.warning?.main || '#FBBF24'; // Amber Glow
    case 'reasoning_goal':
      return theme.palette.primary.light || '#2DD4BF'; // Bright Teal
    case 'reasoning_step':
      return '#34D399'; // Emerald
    case 'reasoning_tool':
      return '#C084FC'; // Electric Purple
    case 'reasoning_outcome':
      return theme.palette.success?.main || '#10B981'; // Green
    default:
      return theme.palette.primary.main;
  }
}

export const OrbGraph3D: React.FC<OrbGraph3DProps> = ({
  nodes,
  edges,
  onSelect,
  height = 520,
  centerLabel,
  selectedNodeId,
}) => {
  const theme = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Rotation & zoom refs
  const rotXRef = useRef<number>(0.2);
  const rotYRef = useRef<number>(0);
  const zoomRef = useRef<number>(1.0);

  // Interaction refs
  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number; rotX: number; rotY: number }>({
    x: 0,
    y: 0,
    rotX: 0.2,
    rotY: 0,
  });
  const totalDragDistRef = useRef<number>(0);
  const lastInteractionTimeRef = useRef<number>(performance.now());

  // Hover state
  const hoveredNodeIdRef = useRef<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<OrbNode | null>(null);

  // Projected nodes ref for hit testing
  const projectedNodesRef = useRef<ProjectedNode[]>([]);

  // Simulation position map
  const positionsRef = useRef<Map<string, Node3DPos>>(new Map());

  // Cap visible nodes at top 300 by strength
  const visibleNodes = useMemo(() => {
    return [...nodes].sort((a, b) => b.strength - a.strength).slice(0, 300);
  }, [nodes]);

  const visibleEdges = useMemo(() => {
    const nodeIds = new Set(visibleNodes.map((n) => n.id));
    return edges.filter((e) => nodeIds.has(e.from) && nodeIds.has(e.to));
  }, [edges, visibleNodes]);

  const top20Ids = useMemo(() => {
    return new Set(
      [...visibleNodes].sort((a, b) => b.strength - a.strength).slice(0, 20).map((n) => n.id),
    );
  }, [visibleNodes]);

  // Record user interaction timestamp to pause idle auto-rotation
  const markInteraction = useCallback(() => {
    lastInteractionTimeRef.current = performance.now();
  }, []);

  // Run 3D Force-Directed Simulation on layout change
  useEffect(() => {
    const posMap = positionsRef.current;

    // Initialize position for new nodes
    for (const n of visibleNodes) {
      if (!posMap.has(n.id)) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(Math.random() * 2 - 1);
        const r = 90 + Math.random() * 110;
        posMap.set(n.id, {
          x: r * Math.sin(phi) * Math.cos(theta),
          y: r * Math.sin(phi) * Math.sin(theta),
          z: r * Math.cos(phi),
          vx: 0,
          vy: 0,
          vz: 0,
        });
      }
    }

    // Clean up unmapped nodes
    const visibleSet = new Set(visibleNodes.map((n) => n.id));
    for (const id of posMap.keys()) {
      if (!visibleSet.has(id)) posMap.delete(id);
    }

    // Run ~120 simulation ticks
    const k = 100;
    for (let tick = 0; tick < 120; tick++) {
      const arr = visibleNodes;
      const len = arr.length;

      // Pairwise repulsion
      for (let i = 0; i < len; i++) {
        const idA = arr[i].id;
        const pA = posMap.get(idA)!;
        for (let j = i + 1; j < len; j++) {
          const idB = arr[j].id;
          const pB = posMap.get(idB)!;
          const dx = pB.x - pA.x;
          const dy = pB.y - pA.y;
          const dz = pB.z - pA.z;
          const distSq = dx * dx + dy * dy + dz * dz + 1.0;
          const dist = Math.sqrt(distSq);
          const force = (k * k) / distSq;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          const fz = (dz / dist) * force;

          pA.vx -= fx * 0.1;
          pA.vy -= fy * 0.1;
          pA.vz -= fz * 0.1;
          pB.vx += fx * 0.1;
          pB.vy += fy * 0.1;
          pB.vz += fz * 0.1;
        }
      }

      // Edge attraction
      for (const e of visibleEdges) {
        const pA = posMap.get(e.from);
        const pB = posMap.get(e.to);
        if (!pA || !pB) continue;
        const dx = pB.x - pA.x;
        const dy = pB.y - pA.y;
        const dz = pB.z - pA.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.01;
        const force = (dist - 75) * 0.04 * (e.weight ?? 1);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        const fz = (dz / dist) * force;

        pA.vx += fx;
        pA.vy += fy;
        pA.vz += fz;
        pB.vx -= fx;
        pB.vy -= fy;
        pB.vz -= fz;
      }

      // Gravity & damping
      for (const n of arr) {
        const p = posMap.get(n.id)!;
        p.vx -= p.x * 0.006;
        p.vy -= p.y * 0.006;
        p.vz -= p.z * 0.006;

        p.x += p.vx * 0.5;
        p.y += p.vy * 0.5;
        p.z += p.vz * 0.5;

        p.vx *= 0.8;
        p.vy *= 0.8;
        p.vz *= 0.8;
      }
    }
  }, [visibleNodes, visibleEdges]);

  // Main Animation & Render Loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const render = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      // Idle auto-rotation: when user hasn't dragged/interacted for >2s, slowly auto-rotate
      const timeSinceInteraction = (now - lastInteractionTimeRef.current) / 1000;
      if (!isDraggingRef.current && timeSinceInteraction > 2.0) {
        const ramp = Math.min(1.0, (timeSinceInteraction - 2.0) / 1.5);
        rotYRef.current += 0.12 * dt * ramp;
      }

      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (canvas && container) {
        const rect = container.getBoundingClientRect();
        const width = rect.width || 600;
        const dpr = window.devicePixelRatio || 1;

        if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
          canvas.width = width * dpr;
          canvas.height = height * dpr;
        }

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.save();
          ctx.scale(dpr, dpr);

          // Deep Dark Canvas Background (JARVIS space HUD style)
          ctx.fillStyle = '#020617';
          ctx.fillRect(0, 0, width, height);

          // Subtle background grid ambiance
          ctx.save();
          ctx.strokeStyle = 'rgba(20, 184, 166, 0.04)';
          ctx.lineWidth = 1;
          const gridSize = 40;
          for (let gx = 0; gx < width; gx += gridSize) {
            ctx.beginPath();
            ctx.moveTo(gx, 0);
            ctx.lineTo(gx, height);
            ctx.stroke();
          }
          for (let gy = 0; gy < height; gy += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, gy);
            ctx.lineTo(width, gy);
            ctx.stroke();
          }
          ctx.restore();

          const cx = width / 2;
          const cy = height / 2;
          const rotX = rotXRef.current;
          const rotY = rotYRef.current;
          const zoom = zoomRef.current;

          const cosX = Math.cos(rotX);
          const sinX = Math.sin(rotX);
          const cosY = Math.cos(rotY);
          const sinY = Math.sin(rotY);

          const fov = 480 * zoom;
          const zOffset = 380;

          const posMap = positionsRef.current;
          const projNodes: ProjectedNode[] = [];
          const projMap = new Map<string, ProjectedNode>();

          // Project nodes
          for (const node of visibleNodes) {
            const pos = posMap.get(node.id) ?? { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 };

            // Rotate Pitch (X)
            const y1 = pos.y * cosX - pos.z * sinX;
            const z1 = pos.y * sinX + pos.z * cosX;

            // Rotate Yaw (Y)
            const x2 = pos.x * cosY + z1 * sinY;
            const z2 = -pos.x * sinY + z1 * cosY;
            const y2 = y1;

            const scale = fov / (fov + z2 + zOffset);
            const sx = cx + x2 * scale;
            const sy = cy + y2 * scale;

            // Strength (1..10) -> radius (3.5..13px)
            const baseR = 3.5 + Math.min(Math.max(node.strength - 1, 0), 9) * 1.0;
            const r = Math.max(1.8, baseR * scale);

            // Depth opacity (atmospheric depth)
            const alpha = Math.max(0.22, Math.min(1.0, (z2 + 380) / 550));
            const color = getNodeColor(node.type, theme);

            const proj: ProjectedNode = {
              node,
              sx,
              sy,
              sz: z2,
              r,
              alpha,
              color,
            };

            projNodes.push(proj);
            projMap.set(node.id, proj);
          }

          projectedNodesRef.current = projNodes;

          // Project edges
          const projEdges: ProjectedEdge[] = [];
          const activeHoverId = hoveredNodeIdRef.current;

          for (const edge of visibleEdges) {
            const pFrom = projMap.get(edge.from);
            const pTo = projMap.get(edge.to);
            if (!pFrom || !pTo) continue;

            const isDirect =
              Boolean(activeHoverId) &&
              (edge.from === activeHoverId || edge.to === activeHoverId);

            const isSelectedEdge =
              Boolean(selectedNodeId) &&
              (edge.from === selectedNodeId || edge.to === selectedNodeId);

            const avgAlpha = (pFrom.alpha + pTo.alpha) / 2;
            const baseOpacity = Math.min(0.45, Math.max(0.12, (edge.weight ?? 1) * 0.12));
            const edgeAlpha = isDirect || isSelectedEdge ? 0.95 : avgAlpha * baseOpacity;

            projEdges.push({
              fromX: pFrom.sx,
              fromY: pFrom.sy,
              toX: pTo.sx,
              toY: pTo.sy,
              weight: edge.weight ?? 1,
              alpha: edgeAlpha,
              isDirect: isDirect || isSelectedEdge,
              fromId: edge.from,
              toId: edge.to,
            });
          }

          // Sort depth back to front
          projNodes.sort((a, b) => b.sz - a.sz);

          // 1. Draw Glowing Connecting Edges
          for (const e of projEdges) {
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(e.fromX, e.fromY);
            ctx.lineTo(e.toX, e.toY);

            if (e.isDirect) {
              ctx.strokeStyle = '#06B6D4'; // Cyan glow
              ctx.shadowColor = '#06B6D4';
              ctx.shadowBlur = 10;
              ctx.lineWidth = 2.2;
              ctx.globalAlpha = e.alpha;
            } else {
              ctx.strokeStyle = 'rgba(20, 184, 166, 0.45)'; // Faint teal
              ctx.shadowColor = '#14B8A6';
              ctx.shadowBlur = 4;
              ctx.lineWidth = Math.max(0.6, Math.min(1.8, e.weight * 0.6));
              ctx.globalAlpha = e.alpha;
            }
            ctx.stroke();
            ctx.restore();
          }

          // 2. Draw Glowing Nodes
          const pulsePhase = (now / 280) % (Math.PI * 2);

          for (const p of projNodes) {
            const isSelected = p.node.id === selectedNodeId;
            const isHovered = p.node.id === activeHoverId;
            const isTop20 = top20Ids.has(p.node.id);

            ctx.save();
            ctx.globalAlpha = isHovered || isSelected ? 1.0 : p.alpha;

            // Glowing nodes with shadowBlur & shadowColor
            const glowAmount = isSelected
              ? 24
              : isHovered
                ? 18
                : isTop20
                  ? 14
                  : Math.max(6, Math.round(p.r * 2.2));

            ctx.shadowBlur = glowAmount;
            ctx.shadowColor = isSelected ? '#06B6D4' : p.color;

            // Node Circle with radial white-hot center core
            const radGrad = ctx.createRadialGradient(
              p.sx,
              p.sy,
              0,
              p.sx,
              p.sy,
              p.r,
            );
            radGrad.addColorStop(0, '#ffffff');
            radGrad.addColorStop(0.5, p.color);
            radGrad.addColorStop(1, p.color);

            ctx.beginPath();
            ctx.arc(p.sx, p.sy, p.r, 0, Math.PI * 2);
            ctx.fillStyle = radGrad;
            ctx.fill();

            // Selected Node Pulsing Highlight Ring + JARVIS HUD Reticle
            if (isSelected) {
              // Inner glowing pulse ring
              const pulseR = p.r + 5 + Math.sin(pulsePhase) * 3;
              ctx.beginPath();
              ctx.arc(p.sx, p.sy, pulseR, 0, Math.PI * 2);
              ctx.strokeStyle = '#22D3EE'; // Cyan
              ctx.shadowBlur = 16;
              ctx.shadowColor = '#06B6D4';
              ctx.lineWidth = 2;
              ctx.globalAlpha = 0.95;
              ctx.stroke();

              // Outer dashed target ring
              const outerR = p.r + 11 + Math.sin(pulsePhase * 1.5) * 2;
              ctx.save();
              ctx.beginPath();
              ctx.arc(p.sx, p.sy, outerR, 0, Math.PI * 2);
              ctx.setLineDash([4, 4]);
              ctx.strokeStyle = 'rgba(20, 184, 166, 0.7)';
              ctx.lineWidth = 1;
              ctx.stroke();
              ctx.restore();

              // HUD Reticle Corner Ticks
              const tickDist = outerR + 4;
              const tickLen = 4;
              const angles = [0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2];
              ctx.save();
              ctx.strokeStyle = '#22D3EE';
              ctx.lineWidth = 1.5;
              for (const a of angles) {
                const tx1 = p.sx + Math.cos(a) * (tickDist - tickLen);
                const ty1 = p.sy + Math.sin(a) * (tickDist - tickLen);
                const tx2 = p.sx + Math.cos(a) * (tickDist + tickLen);
                const ty2 = p.sy + Math.sin(a) * (tickDist + tickLen);
                ctx.beginPath();
                ctx.moveTo(tx1, ty1);
                ctx.lineTo(tx2, ty2);
                ctx.stroke();
              }
              ctx.restore();
            }

            // Hovered Node Outline
            if (isHovered && !isSelected) {
              ctx.beginPath();
              ctx.arc(p.sx, p.sy, p.r + 4, 0, Math.PI * 2);
              ctx.strokeStyle = p.color;
              ctx.shadowBlur = 12;
              ctx.shadowColor = p.color;
              ctx.lineWidth = 1.8;
              ctx.globalAlpha = 0.9;
              ctx.stroke();
            }

            ctx.restore();

            // Render label text for hovered / selected or high-strength nodes
            if (isHovered || isSelected || (p.node.strength >= 5 && p.alpha > 0.6)) {
              ctx.save();
              ctx.font = isSelected || isHovered ? '700 11px sans-serif' : '500 10px sans-serif';
              ctx.fillStyle = isSelected || isHovered ? '#ffffff' : 'rgba(226, 232, 240, 0.82)';
              ctx.globalAlpha = isSelected || isHovered ? 1.0 : p.alpha * 0.85;
              ctx.textAlign = 'center';
              ctx.shadowBlur = isSelected ? 8 : 4;
              ctx.shadowColor = '#06B6D4';
              ctx.fillText(
                p.node.label.length > 24 ? `${p.node.label.slice(0, 22)}…` : p.node.label,
                p.sx,
                p.sy + p.r + 14,
              );
              ctx.restore();
            }
          }

          ctx.restore();
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [visibleNodes, visibleEdges, selectedNodeId, theme, top20Ids, height]);

  // Pointer position helper
  const getCanvasCoords = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      return {
        x: clientX - rect.left,
        y: clientY - rect.top,
      };
    },
    [],
  );

  // Hit test helper
  const hitTest = useCallback((x: number, y: number): OrbNode | null => {
    let closestNode: OrbNode | null = null;
    let minDistance = 16; // max hit radius 16px

    for (const p of projectedNodesRef.current) {
      const dx = p.sx - x;
      const dy = p.sy - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < Math.max(p.r + 6, minDistance)) {
        minDistance = dist;
        closestNode = p.node;
      }
    }
    return closestNode;
  }, []);

  // Event handlers
  const handlePointerDown = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    markInteraction();
    isDraggingRef.current = true;
    totalDragDistRef.current = 0;
    const { x, y } = getCanvasCoords(e);
    dragStartRef.current = {
      x,
      y,
      rotX: rotXRef.current,
      rotY: rotYRef.current,
    };
  };

  const handlePointerMove = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    const { x, y } = getCanvasCoords(e);

    if (isDraggingRef.current) {
      markInteraction();
      const dx = x - dragStartRef.current.x;
      const dy = y - dragStartRef.current.y;
      totalDragDistRef.current += Math.abs(dx) + Math.abs(dy);

      rotYRef.current = dragStartRef.current.rotY + dx * 0.008;
      rotXRef.current = Math.max(
        -Math.PI / 2 + 0.1,
        Math.min(Math.PI / 2 - 0.1, dragStartRef.current.rotX - dy * 0.008),
      );
    } else {
      // Hover hit testing
      const hit = hitTest(x, y);
      const hitId = hit ? hit.id : null;
      if (hitId !== hoveredNodeIdRef.current) {
        hoveredNodeIdRef.current = hitId;
        setHoveredNode(hit);
      }
    }
  };

  const handlePointerUp = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    markInteraction();
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      // If pointer moved < 6px total, treat as tap / click
      if (totalDragDistRef.current < 6) {
        const { x, y } = getCanvasCoords(e);
        const hit = hitTest(x, y);
        if (hit && onSelect) {
          onSelect(hit);
        }
      }
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    markInteraction();
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    zoomRef.current = Math.max(0.4, Math.min(2.5, zoomRef.current + delta));
  };

  // Keyboard accessibility
  const handleKeyDown = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    markInteraction();
    const step = 0.08;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      rotYRef.current -= step;
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      rotYRef.current += step;
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      rotXRef.current -= step;
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      rotXRef.current += step;
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      // Select node nearest to canvas center
      const canvas = canvasRef.current;
      if (!canvas) return;
      const cx = canvas.width / (2 * (window.devicePixelRatio || 1));
      const cy = canvas.height / (2 * (window.devicePixelRatio || 1));
      const nearest = hitTest(cx, cy);
      if (nearest && onSelect) {
        onSelect(nearest);
      } else if (projectedNodesRef.current.length > 0 && onSelect) {
        // Fallback to highest strength visible node if center is empty
        onSelect(projectedNodesRef.current[0].node);
      }
    }
  };

  return (
    <Box
      ref={containerRef}
      sx={{
        position: 'relative',
        width: '100%',
        height,
        outline: 'none',
        userSelect: 'none',
      }}
    >
      {centerLabel && (
        <Box
          sx={{
            position: 'absolute',
            top: 16,
            left: 20,
            zIndex: 2,
            pointerEvents: 'none',
          }}
        >
          <Typography
            variant="overline"
            sx={{
              color: '#22D3EE',
              letterSpacing: 3,
              fontWeight: 800,
              textTransform: 'uppercase',
              textShadow: '0 0 10px rgba(6, 182, 212, 0.5)',
            }}
          >
            {centerLabel}
          </Typography>
        </Box>
      )}

      {hoveredNode && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 16,
            left: 20,
            zIndex: 2,
            pointerEvents: 'none',
            bgcolor: 'rgba(2, 6, 23, 0.9)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(20, 184, 166, 0.35)',
            borderRadius: 1.5,
            px: 1.75,
            py: 1,
            maxWidth: 280,
            boxShadow: '0 0 15px rgba(20, 184, 166, 0.2)',
          }}
        >
          <Typography variant="caption" sx={{ color: '#f8fafc', fontWeight: 700, display: 'block' }}>
            {hoveredNode.label}
          </Typography>
          <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.7rem' }}>
            Type: <span style={{ color: '#22D3EE', fontWeight: 600 }}>{hoveredNode.type}</span> · Strength: <span style={{ color: '#14B8A6', fontWeight: 600 }}>{hoveredNode.strength}</span>
          </Typography>
        </Box>
      )}

      <canvas
        ref={canvasRef}
        tabIndex={0}
        role="img"
        aria-label={centerLabel || '3D Interactive Graph Visualizer'}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={() => {
          isDraggingRef.current = false;
          hoveredNodeIdRef.current = null;
          setHoveredNode(null);
        }}
        onWheel={handleWheel}
        onKeyDown={handleKeyDown}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          cursor: hoveredNode ? 'pointer' : 'grab',
        }}
      />
    </Box>
  );
};

export default OrbGraph3D;
