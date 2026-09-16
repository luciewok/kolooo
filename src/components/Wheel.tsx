import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Prize } from '../types';
import { soundEngine } from '../utils/audio';
import { resolvePrizeImage } from '../utils/storage';
import confetti from 'canvas-confetti';
import { RefreshCw, RotateCw, AlertCircle } from 'lucide-react';

interface WheelProps {
  prizes: Prize[];
  soundEnabled: boolean;
  onToggleSound: () => void;
  onSpinEnd: (winningPrize: Prize) => void;
  eventTitle?: string;
  eventSubTitle?: string;
}

export const Wheel: React.FC<WheelProps> = ({
  prizes,
  soundEnabled,
  onToggleSound,
  onSpinEnd,
  eventSubTitle = 'Oslav s námi příchod řady Google Pixel 11 vyhraj skvělé ceny!',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Active prizes filter (items that are active and not out of stock)
  const availablePrizes = prizes.filter(
    (p) => p.active && (p.stock === undefined || p.stock === null || p.stock > 0)
  );

  const [isSpinning, setIsSpinning] = useState(false);
  const [dragNotice, setDragNotice] = useState(true);

  // Wheel state refs for animation loop
  const currentAngleRef = useRef<number>(0);
  const velocityRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);
  const lastMouseAngleRef = useRef<number>(0);
  const lastMouseTimeRef = useRef<number>(0);
  const animFrameIdRef = useRef<number | null>(null);
  const lastSliceIndexRef = useRef<number>(-1);
  const targetAngleRef = useRef<number | null>(null);
  const spinStartAngleRef = useRef<number>(0);
  const spinStartTimeRef = useRef<number>(0);
  const spinDurationRef = useRef<number>(0);
  const isDeceleratingRef = useRef<boolean>(false);
  const winningPrizeRef = useRef<Prize | null>(null);

  // Dynamic animation phase tracking
  const currentSpeedRef = useRef<number>(0);
  const pulsePhaseRef = useRef<number>(0);
  const chasePhaseRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);

  // Needle deflection and spring physics
  const needleAngleRef = useRef<number>(0);
  const needleTargetAngleRef = useRef<number>(0);
  const lastPassedPegRef = useRef<number>(-1);

  // Center image ref
  const centerImageRef = useRef<HTMLImageElement | null>(null);
  // Prize illustrations image cache
  const prizeImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());

  // Trigger celebratory confetti burst
  const triggerConfetti = () => {
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#ffffff', '#f59e0b', '#ec4899', '#3b82f6', '#10b981', '#8b5cf6'],
    });
  };

  // Draw wheel on canvas
  const drawWheel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 30;

    const now = performance.now();

    ctx.clearRect(0, 0, width, height);

    const activeList = availablePrizes;
    const totalSlices = activeList.length;

    if (totalSlices === 0) {
      // Draw empty wheel
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fillStyle = '#1e293b';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = '300 22px "Google Sans", "DM Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Žádné dostupné výhry', centerX, centerY);
      ctx.restore();
      return;
    }

    const sliceAngle = (Math.PI * 2) / totalSlices;

    // Ambient glow and dynamic pulse parameters tied to instantaneous velocity
    const speedRatio = Math.min(1, currentSpeedRef.current / 0.28); // 0 in idle, 1 at full speed
    const pulseFreq = 0.003 + 0.022 * speedRatio;
    const chaseSpeed = 0.003 + 0.02 * speedRatio;

    // Advance continuous phases smoothly based on delta time
    const dt = lastFrameTimeRef.current > 0 ? Math.min(64, now - lastFrameTimeRef.current) : 16;
    pulsePhaseRef.current += dt * pulseFreq;
    chasePhaseRef.current += dt * chaseSpeed;
    lastFrameTimeRef.current = now;

    const glowIntensity = isSpinning
      ? (0.35 + 0.35 * speedRatio) + (0.15 + 0.2 * speedRatio) * Math.sin(pulsePhaseRef.current)
      : 0.28 + 0.14 * Math.sin(pulsePhaseRef.current);

    // Center pulse scale tied to velocity
    const pulseAmp = isSpinning ? 0.025 + 0.035 * speedRatio : 0.025;
    const centerScale = 1 + pulseAmp * Math.sin(pulsePhaseRef.current);

    // 0. Draw Background Ambient Aura
    ctx.save();
    const bgAura = ctx.createRadialGradient(centerX, centerY, radius * 0.8, centerX, centerY, radius + 28);
    bgAura.addColorStop(0, `rgba(229, 169, 149, ${glowIntensity * 0.15})`);
    bgAura.addColorStop(0.7, `rgba(229, 169, 149, ${glowIntensity * 0.08})`);
    bgAura.addColorStop(1, 'rgba(229, 169, 149, 0)');
    ctx.fillStyle = bgAura;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(currentAngleRef.current);

    // 1. Draw Outer Glowing Rim
    ctx.beginPath();
    ctx.arc(0, 0, radius + 14, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(229, 169, 149, ${0.04 + glowIntensity * 0.05})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(229, 169, 149, ${0.2 + glowIntensity * 0.25})`;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Outer Rim Metallic Ring (Rose-gold / Bronze Pixel 11 Pro metallic rim)
    ctx.beginPath();
    ctx.arc(0, 0, radius + 4, 0, Math.PI * 2);
    const rimGrad = ctx.createLinearGradient(-radius, -radius, radius, radius);
    rimGrad.addColorStop(0, '#f5d5c8');
    rimGrad.addColorStop(0.3, '#c88f71');
    rimGrad.addColorStop(0.7, '#8e5944');
    rimGrad.addColorStop(1, '#e5a995');
    ctx.strokeStyle = rimGrad;
    ctx.lineWidth = 9;
    ctx.stroke();

    // Outer Rim Dynamic Chasing / Twinkling Lights
    const numDots = Math.max(24, totalSlices * 3);

    for (let i = 0; i < numDots; i++) {
      const dotAngle = (i * Math.PI * 2) / numDots;
      const dotX = Math.cos(dotAngle) * (radius + 4);
      const dotY = Math.sin(dotAngle) * (radius + 4);

      // Chasing wave effect around perimeter driven by velocity-linked phase
      const wave = Math.sin(chasePhaseRef.current + (i / numDots) * Math.PI * 4) * 0.5 + 0.5;

      ctx.beginPath();
      const dotSize = 2.5 + wave * 1.5;
      ctx.arc(dotX, dotY, dotSize, 0, Math.PI * 2);

      if (wave > 0.65) {
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#f5d5c8';
        ctx.shadowBlur = isSpinning ? 8 : 4;
      } else if (i % 2 === 0) {
        ctx.fillStyle = '#f5d5c8';
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = 'rgba(229, 169, 149, 0.45)';
        ctx.shadowBlur = 0;
      }
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // 2. Draw Slices (Unified porcelain blush and white finish matching Pixel 11)
    for (let i = 0; i < totalSlices; i++) {
      const prize = activeList[i];
      const startAngle = i * sliceAngle;
      const endAngle = startAngle + sliceAngle;
      const midAngle = startAngle + sliceAngle / 2;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, startAngle, endAngle);
      ctx.closePath();

      const isEven = i % 2 === 0;
      const isGrandPrize = prize.name.toLowerCase().includes('hlavní');

      // Satin Porcelain Gradient for delicate silky touch
      const cosMid = Math.cos(midAngle);
      const sinMid = Math.sin(midAngle);
      const sliceGrad = ctx.createRadialGradient(
        0,
        0,
        30,
        cosMid * (radius * 0.65),
        sinMid * (radius * 0.65),
        radius
      );

      if (isGrandPrize) {
        sliceGrad.addColorStop(0, '#fffbf9');
        sliceGrad.addColorStop(0.5, '#fde4da');
        sliceGrad.addColorStop(1, '#f5cfbe');
      } else if (isEven) {
        sliceGrad.addColorStop(0, '#ffffff');
        sliceGrad.addColorStop(0.55, '#fef6f2');
        sliceGrad.addColorStop(1, '#f8e9e3');
      } else {
        sliceGrad.addColorStop(0, '#fdf7f4');
        sliceGrad.addColorStop(0.55, '#f8ebe4');
        sliceGrad.addColorStop(1, '#f1d7cc');
      }

      ctx.fillStyle = sliceGrad;
      ctx.fill();

      // Subtle porcelain edge gloss
      const edgeGloss = ctx.createRadialGradient(0, 0, radius - 45, 0, 0, radius);
      edgeGloss.addColorStop(0, 'rgba(255, 255, 255, 0)');
      edgeGloss.addColorStop(0.85, 'rgba(255, 255, 255, 0.45)');
      edgeGloss.addColorStop(1, 'rgba(229, 169, 149, 0.2)');
      ctx.fillStyle = edgeGloss;
      ctx.fill();
    }

    // 2b. Draw Distinct Golden-Apricot Divider Rays
    for (let i = 0; i < totalSlices; i++) {
      const startAngle = i * sliceAngle;
      const edgeX = Math.cos(startAngle) * radius;
      const edgeY = Math.sin(startAngle) * radius;

      // Divider Ray line with metallic rose-gold / apricot gradient
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(edgeX, edgeY);

      const dividerGrad = ctx.createLinearGradient(0, 0, edgeX, edgeY);
      dividerGrad.addColorStop(0, '#c88f71');
      dividerGrad.addColorStop(0.35, '#e5a995');
      dividerGrad.addColorStop(0.7, '#f5d5c8');
      dividerGrad.addColorStop(1, '#c88f71');

      ctx.strokeStyle = dividerGrad;
      ctx.lineWidth = 4;
      ctx.stroke();

      // Outer golden rivet / bead accent at the end of each ray with twinkle
      const rivetTwinkle = Math.sin(now * (isSpinning ? 0.02 : 0.0025) + (i / totalSlices) * Math.PI * 2) * 0.5 + 0.5;
      ctx.beginPath();
      ctx.arc(edgeX, edgeY, 3 + rivetTwinkle * 1, 0, Math.PI * 2);
      ctx.fillStyle = rivetTwinkle > 0.7 ? '#ffffff' : '#f5d5c8';
      ctx.fill();
      ctx.strokeStyle = '#8e5944';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // 2c. Draw Slice Content: Balanced Composition with Product Photo & Title
    const fontStack = '"Google Sans", "DM Sans", "Outfit", "Plus Jakarta Sans", system-ui, -apple-system, sans-serif';

    for (let i = 0; i < totalSlices; i++) {
      const prize = activeList[i];
      const startAngle = i * sliceAngle;
      const midAngle = startAngle + sliceAngle / 2;
      const isGrandPrize =
        prize.name.toLowerCase().includes('hlavní') ||
        prize.name.toLowerCase().includes('pixel buds') ||
        prize.id === 'p5';

      ctx.save();
      ctx.rotate(midAngle);

      // --- A. PRODUCT ILLUSTRATION / IMAGE ---
      const imgRadius = 232;
      const imgSrc = prize.image || resolvePrizeImage(prize);

      // Load on demand if missing from cache
      if (imgSrc && !prizeImagesRef.current.has(imgSrc)) {
        const img = new Image();
        img.src = imgSrc;
        img.onload = () => drawWheel();
        prizeImagesRef.current.set(imgSrc, img);
      }

      const imgObj = imgSrc ? prizeImagesRef.current.get(imgSrc) : null;

      ctx.save();
      ctx.translate(imgRadius, 0);
      ctx.rotate(Math.PI / 2); // Rotate 90° so image stands upright when slice is at top

      // Soft luminous backdrop aura behind product photo for crisp contrast
      const imgGlow = ctx.createRadialGradient(0, 0, 10, 0, 0, 54);
      imgGlow.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
      imgGlow.addColorStop(0.65, 'rgba(255, 255, 255, 0.35)');
      imgGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = imgGlow;
      ctx.beginPath();
      ctx.arc(0, 0, 54, 0, Math.PI * 2);
      ctx.fill();

      // Product image rendering with realistic drop shadow
      const imgSize = 100;
      if (imgObj && imgObj.complete && imgObj.naturalWidth > 0) {
        ctx.shadowColor = 'rgba(40, 20, 15, 0.22)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 4;
        ctx.drawImage(imgObj, -imgSize / 2, -imgSize / 2, imgSize, imgSize);
      }
      ctx.restore();

      // --- B. PRIZE TITLE TEXT ---
      const textRadius = 318;
      ctx.save();
      ctx.translate(textRadius, 0);
      ctx.rotate(Math.PI / 2); // Rotate 90° so text reads horizontally & upright when slice is at top

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Width of the wedge available at this radius with safe margins
      const maxTextWidth = Math.min(215, 2 * textRadius * Math.tan(sliceAngle / 2) - 20);

      let text = prize.name;
      let fontSize = isGrandPrize ? 17 : 16;
      const weight = isGrandPrize ? '600' : '500';
      ctx.font = `${weight} ${fontSize}px ${fontStack}`;

      ctx.fillStyle = isGrandPrize ? '#7c2d10' : '#1f130e';
      ctx.shadowColor = 'rgba(255, 255, 255, 0.95)';
      ctx.shadowBlur = 2;
      ctx.shadowOffsetY = 1;

      const measuredWidth = ctx.measureText(text).width;

      if (measuredWidth <= maxTextWidth) {
        // Fits comfortably on single line
        ctx.fillText(text, 0, 0);
      } else {
        // Multi-line wrap if space allows
        const words = text.split(' ');
        if (words.length > 1) {
          const mid = Math.ceil(words.length / 2);
          const line1 = words.slice(0, mid).join(' ');
          const line2 = words.slice(mid).join(' ');
          fontSize = Math.min(14, fontSize);
          ctx.font = `${weight} ${fontSize}px ${fontStack}`;
          ctx.fillText(line1, 0, -fontSize * 0.65);
          ctx.fillText(line2, 0, fontSize * 0.65);
        } else {
          fontSize = Math.max(12, Math.floor(fontSize * (maxTextWidth / measuredWidth)));
          ctx.font = `${weight} ${fontSize}px ${fontStack}`;
          ctx.fillText(text, 0, 0);
        }
      }

      // Grand prize badge dot
      if (isGrandPrize) {
        ctx.fillStyle = '#e5a995';
        ctx.beginPath();
        ctx.arc(0, -fontSize - 4, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      ctx.restore();
    }

    // 3. Draw Center Ambient Halo Glow
    const centerRadius = 72;
    const auraRadius = centerRadius * 1.55;
    const centerAuraGrad = ctx.createRadialGradient(0, 0, centerRadius * 0.4, 0, 0, auraRadius);
    centerAuraGrad.addColorStop(0, `rgba(245, 213, 200, ${glowIntensity * 0.65})`);
    centerAuraGrad.addColorStop(0.5, `rgba(229, 169, 149, ${glowIntensity * 0.35})`);
    centerAuraGrad.addColorStop(1, 'rgba(229, 169, 149, 0)');
    ctx.fillStyle = centerAuraGrad;
    ctx.beginPath();
    ctx.arc(0, 0, auraRadius, 0, Math.PI * 2);
    ctx.fill();

    // 3b. Draw Dynamic Pulsing Center Cap with rotating image
    ctx.save();
    ctx.scale(centerScale, centerScale);

    ctx.beginPath();
    ctx.arc(0, 0, centerRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#17110e';
    ctx.fill();
    ctx.clip();

    if (centerImageRef.current && centerImageRef.current.complete) {
      // Add subtle inner padding from the metallic ring
      const imagePadding = 12;
      const imgSize = (centerRadius - imagePadding) * 2;
      ctx.drawImage(
        centerImageRef.current,
        -(centerRadius - imagePadding),
        -(centerRadius - imagePadding),
        imgSize,
        imgSize
      );
    }
    ctx.restore();

    // Center metallic rim with pulsing highlight
    ctx.save();
    ctx.scale(centerScale, centerScale);
    ctx.beginPath();
    ctx.arc(0, 0, centerRadius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(245, 213, 200, ${0.7 + glowIntensity * 0.3})`;
    ctx.lineWidth = 3.5;
    ctx.stroke();
    ctx.restore();

    ctx.restore(); // Restore center translation

    // 4. Draw Top Needle / Indicator Arrow
    ctx.save();
    ctx.translate(centerX, centerY - radius + 4);
    ctx.rotate(needleAngleRef.current * (Math.PI / 180));

    // Needle shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 5;

    // Pointer shape
    ctx.beginPath();
    ctx.moveTo(0, 26);
    ctx.lineTo(-17, -20);
    ctx.lineTo(0, -32);
    ctx.lineTo(17, -20);
    ctx.closePath();

    const pointerGrad = ctx.createLinearGradient(0, -32, 0, 26);
    pointerGrad.addColorStop(0, '#f5d5c8');
    pointerGrad.addColorStop(0.5, '#e5a995');
    pointerGrad.addColorStop(1, '#c88f71');
    ctx.fillStyle = pointerGrad;
    ctx.fill();

    ctx.strokeStyle = '#080606';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Needle pivot dot
    ctx.beginPath();
    ctx.arc(0, -12, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#f5d5c8';
    ctx.fill();
    ctx.strokeStyle = '#8e5944';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();

    ctx.restore();
  }, [availablePrizes, prizes]);

  // Preload center image
  useEffect(() => {
    const img = new Image();
    img.src = `/prostredek.png?v=${Date.now()}`;
    img.onload = () => {
      centerImageRef.current = img;
      drawWheel();
    };
  }, [drawWheel]);

  // Preload all available prize images
  useEffect(() => {
    const images = prizeImagesRef.current;

    availablePrizes.forEach((prize) => {
      const src = prize.image || resolvePrizeImage(prize);
      if (src && !images.has(src)) {
        const img = new Image();
        img.src = src;
        img.onload = () => {
          drawWheel();
        };
        images.set(src, img);
      }
    });
  }, [availablePrizes, drawWheel]);

  // Main animation loop
  const animate = useCallback(() => {
    if (availablePrizes.length === 0) return;

    const totalSlices = availablePrizes.length;
    const sliceAngle = (Math.PI * 2) / totalSlices;

    // Handle high-suspense deceleration animation
    if (isDeceleratingRef.current && targetAngleRef.current !== null) {
      const now = performance.now();
      const elapsed = now - spinStartTimeRef.current;
      const duration = spinDurationRef.current;

      if (elapsed < duration) {
        const rawT = Math.min(1, elapsed / duration);
        // Cinematic suspense curve (quintic ease-out with deep suspense tail)
        const easeT = 1 - Math.pow(1 - rawT, 4.6);
        const prevAngle = currentAngleRef.current;
        currentAngleRef.current =
          spinStartAngleRef.current + (targetAngleRef.current - spinStartAngleRef.current) * easeT;
        currentSpeedRef.current = Math.abs(currentAngleRef.current - prevAngle);
      } else {
        // Spin completed perfectly on target!
        currentAngleRef.current = targetAngleRef.current;
        currentSpeedRef.current = 0;
        isDeceleratingRef.current = false;
        setIsSpinning(false);
        targetAngleRef.current = null;
        needleAngleRef.current = 0;

        if (winningPrizeRef.current) {
          const winner = winningPrizeRef.current;
          soundEngine.playWin(soundEnabled);
          triggerConfetti();
          setTimeout(() => {
            onSpinEnd(winner);
          }, 350);
        }
      }
    } else if (isSpinning && !isDraggingRef.current) {
      // Free spin deceleration if released from swipe without trigger
      currentAngleRef.current += velocityRef.current;
      currentSpeedRef.current = Math.abs(velocityRef.current);
      velocityRef.current *= 0.985;

      if (velocityRef.current < 0.005) {
        velocityRef.current = 0;
        currentSpeedRef.current = 0;
        setIsSpinning(false);
      }
    } else {
      currentSpeedRef.current = 0;
    }

    // Physical Pin-Needle deflection and tick detection
    const normalizedRot = (currentAngleRef.current % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    let pointerRelativeAngle = (Math.PI * 1.5 - normalizedRot) % (Math.PI * 2);
    if (pointerRelativeAngle < 0) pointerRelativeAngle += Math.PI * 2;

    const currentSliceIdx = Math.floor(pointerRelativeAngle / sliceAngle);

    // Calculate angular distance to the nearest passing divider peg
    const pegOffset = pointerRelativeAngle % sliceAngle;
    const contactZone = Math.min(0.2, sliceAngle * 0.35);

    if (pegOffset < contactZone) {
      // Pin is pushing needle
      const pushRatio = 1 - pegOffset / contactZone;
      needleTargetAngleRef.current = -24 * pushRatio;
    } else {
      needleTargetAngleRef.current = 0;
    }

    // Spring damping for responsive physical flapper action
    needleAngleRef.current += (needleTargetAngleRef.current - needleAngleRef.current) * 0.55;

    // Play tick sound when entering a new slice segment
    if (currentSliceIdx !== lastSliceIndexRef.current && lastSliceIndexRef.current !== -1) {
      soundEngine.playTick(soundEnabled);
    }
    lastSliceIndexRef.current = currentSliceIdx;

    drawWheel();
    animFrameIdRef.current = requestAnimationFrame(animate);
  }, [availablePrizes, isSpinning, soundEnabled, drawWheel, onSpinEnd]);

  useEffect(() => {
    animFrameIdRef.current = requestAnimationFrame(animate);
    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [animate]);

  // Weighted prize selector
  const selectWeightedWinner = (): Prize => {
    const list = availablePrizes;
    const totalWeight = list.reduce((sum, p) => sum + (p.weight || 1), 0);
    let rand = Math.random() * totalWeight;

    for (const prize of list) {
      if (rand < (prize.weight || 1)) {
        return prize;
      }
      rand -= prize.weight || 1;
    }
    return list[0];
  };

  // Trigger spin action
  const startSpin = () => {
    if (isSpinning || availablePrizes.length === 0) return;

    setDragNotice(false);
    setIsSpinning(true);
    isDeceleratingRef.current = true;

    // Pick winner
    const winningPrize = selectWeightedWinner();
    winningPrizeRef.current = winningPrize;

    const totalSlices = availablePrizes.length;
    const winningIndex = availablePrizes.findIndex((p) => p.id === winningPrize.id);
    const sliceAngle = (Math.PI * 2) / totalSlices;

    // Center of winning slice angle relative to wheel 0
    const sliceCenterAngle = winningIndex * sliceAngle + sliceAngle / 2;

    // Organic landing offset inside slice (safely inside borders)
    const randomInSlice = (Math.random() - 0.5) * (sliceAngle * 0.55);
    let targetRelative = Math.PI * 1.5 - (sliceCenterAngle + randomInSlice);

    // 10 to 14 full revolutions for high initial velocity and prolonged excitement
    const fullRevolutions = (Math.floor(Math.random() * 4) + 10) * Math.PI * 2;

    const startAngle = currentAngleRef.current;
    let finalTarget = startAngle + fullRevolutions;
    const currentMod = finalTarget % (Math.PI * 2);
    let diff = (targetRelative - currentMod) % (Math.PI * 2);
    if (diff < 0) diff += Math.PI * 2;

    targetAngleRef.current = finalTarget + diff;
    spinStartAngleRef.current = startAngle;
    spinStartTimeRef.current = performance.now();
    // Dramatic duration between 8.0s and 8.8s
    spinDurationRef.current = 8000 + Math.random() * 800;
  };

  // Touch / Drag event handlers for swipe spin
  const getEventAngle = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return 0;
    const rect = canvas.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

    return Math.atan2(clientY - centerY, clientX - centerX);
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (isSpinning || availablePrizes.length === 0) return;
    isDraggingRef.current = true;
    lastMouseAngleRef.current = getEventAngle(e);
    lastMouseTimeRef.current = performance.now();
    velocityRef.current = 0;
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDraggingRef.current) return;
    const currentMouseAngle = getEventAngle(e);
    const now = performance.now();
    const dt = (now - lastMouseTimeRef.current) / 1000;

    let deltaAngle = currentMouseAngle - lastMouseAngleRef.current;
    if (deltaAngle > Math.PI) deltaAngle -= Math.PI * 2;
    if (deltaAngle < -Math.PI) deltaAngle += Math.PI * 2;

    currentAngleRef.current += deltaAngle;
    if (dt > 0) {
      velocityRef.current = deltaAngle / dt / 60; // normalized speed
    }

    lastMouseAngleRef.current = currentMouseAngle;
    lastMouseTimeRef.current = now;
  };

  const handlePointerUp = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    // If dragged with sufficient swipe speed, trigger spin!
    if (Math.abs(velocityRef.current) > 0.02) {
      startSpin();
    }
  };

  return (
    <div className="relative z-10 flex flex-col items-center justify-center w-full px-4 pt-1 pb-4 select-none my-auto -translate-y-4 sm:-translate-y-8 md:-translate-y-12">
      {/* Event Title */}
      <div className="text-center mb-2.5 sm:mb-4 max-w-2xl px-2">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-light text-white tracking-tight">
          Kolo štěstí
        </h2>
      </div>

      {/* Wheel Stage Container */}
      <div
        ref={containerRef}
        className="relative flex items-center justify-center touch-none"
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
      >
        <div className="relative w-[340px] h-[340px] sm:w-[460px] sm:h-[460px] md:w-[540px] md:h-[540px] lg:w-[620px] lg:h-[620px] xl:w-[700px] xl:h-[700px] 2xl:w-[760px] 2xl:h-[760px] max-w-[86vw] max-h-[64vh] aspect-square flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={800}
            height={800}
            className="w-full h-full aspect-square object-contain block cursor-grab active:cursor-grabbing drop-shadow-[0_25px_50px_rgba(0,0,0,0.7)]"
          />

          {/* Center Spin Button Touch Target Overlay */}
          <button
            onClick={startSpin}
            disabled={isSpinning || availablePrizes.length === 0}
            title="Roztočit kolo"
            aria-label="Roztočit kolo"
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 lg:w-32 lg:h-32 rounded-full flex items-center justify-center transition-all transform ${
              isSpinning
                ? 'cursor-not-allowed pointer-events-none'
                : 'hover:scale-105 active:scale-95 cursor-pointer group'
            }`}
          >
            <div className="w-full h-full rounded-full border-2 border-transparent group-hover:border-[#f5d5c8]/50 group-hover:shadow-[0_0_35px_rgba(229,169,149,0.5)] transition-all duration-300 pointer-events-none" />
          </button>
        </div>
      </div>

      {/* Notice hint or out of stock alert */}
      {availablePrizes.length === 0 ? (
        <div className="mt-4 sm:mt-5 md:mt-6 flex items-center gap-2 bg-rose-950/70 border border-rose-500/40 px-5 py-2.5 rounded-full backdrop-blur-md text-rose-200 shadow-lg text-xs sm:text-sm">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>Všechny výhry na kole byly vyčerpány. Doplňte zásoby v administraci.</span>
        </div>
      ) : dragNotice ? (
        <div className="mt-4 sm:mt-5 md:mt-6 flex items-center gap-2 bg-[#171210]/70 border border-[#e5a995]/30 px-5 py-2.5 rounded-full backdrop-blur-md text-[#f5d5c8] shadow-lg text-xs sm:text-sm">
          <RefreshCw className="w-4 h-4 text-[#e5a995] animate-spin" />
          <span>Potažením prstu roztočíš kolo nebo klikni na tlačítko uprostřed</span>
        </div>
      ) : null}
    </div>
  );
};
