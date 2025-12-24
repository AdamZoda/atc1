
import React, { useRef, useEffect, useState } from 'react';
import { User, GameState } from '../types';
import { WHEEL_COLORS } from '../constants';

interface SpinnerWheelProps {
  participants: User[];
  gameState: GameState;
  onSpinEnd: (winnerId: string) => void;
}

const SpinnerWheel: React.FC<SpinnerWheelProps> = ({ participants, gameState, onSpinEnd }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [rotation, setRotation] = useState(0);
  const [isTicking, setIsTicking] = useState(false);

  // Sound generator
  const playClick = () => {
    if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
    
    // Trigger visual tick
    setIsTicking(true);
    setTimeout(() => setIsTicking(false), 50);
  };

  useEffect(() => {
    drawWheel();
  }, [participants, rotation]);

  useEffect(() => {
    if (gameState === 'SPINNING') {
      startAnimation();
    }
  }, [gameState]);

  const drawWheel = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const center = size / 2;
    const radius = center - 10;

    ctx.clearRect(0, 0, size, size);

    if (participants.length === 0) {
      // Draw empty placeholder
      ctx.beginPath();
      ctx.arc(center, center, radius, 0, Math.PI * 2);
      ctx.fillStyle = '#18181b';
      ctx.fill();
      ctx.strokeStyle = '#3f3f46';
      ctx.lineWidth = 4;
      ctx.stroke();
      return;
    }

    const sliceAngle = (Math.PI * 2) / participants.length;

    participants.forEach((user, i) => {
      const startAngle = i * sliceAngle + rotation;
      const endAngle = (i + 1) * sliceAngle + rotation;

      // Draw Slice
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, startAngle, endAngle);
      ctx.fillStyle = WHEEL_COLORS[i % WHEEL_COLORS.length];
      ctx.fill();
      ctx.strokeStyle = '#0a0a0b';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw Text
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(startAngle + sliceAngle / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = i % WHEEL_COLORS.length === 4 ? '#fff' : '#000'; // Dark slices have light text
      ctx.font = 'bold 14px Inter';
      ctx.fillText(user.name.substring(0, 10), radius - 30, 5);
      ctx.restore();
    });

    // Draw Outer Rim Glow
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 8;
    ctx.stroke();

    // Small light dots around rim
    for (let i = 0; i < 24; i++) {
        const dotAngle = (i / 24) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(center + Math.cos(dotAngle) * radius, center + Math.sin(dotAngle) * radius, 3, 0, Math.PI * 2);
        ctx.fillStyle = i % 2 === 0 ? '#fff' : '#f59e0b';
        ctx.fill();
    }
  };

  const startAnimation = () => {
    if (participants.length === 0) return;

    let startTime: number | null = null;
    const spinDuration = 5000;
    const totalRotation = Math.PI * 2 * (10 + Math.random() * 5); // 10-15 full spins
    const initialRotation = rotation;

    let lastClickAngle = 0;
    const sliceAngle = (Math.PI * 2) / participants.length;

    const animate = (time: number) => {
      if (!startTime) startTime = time;
      const progress = Math.min((time - startTime) / spinDuration, 1);
      
      // Easing function: easeOutQuart
      const ease = 1 - Math.pow(1 - progress, 4);
      const currentRotation = initialRotation + totalRotation * ease;
      
      setRotation(currentRotation);

      // Sound logic
      const currentAnglePos = currentRotation % (Math.PI * 2);
      if (Math.abs(currentAnglePos - lastClickAngle) > sliceAngle) {
        playClick();
        lastClickAngle = currentAnglePos;
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Calculate winner
        const finalRotation = (currentRotation % (Math.PI * 2));
        const pointerAngle = (Math.PI * 2 - finalRotation) % (Math.PI * 2);
        const winnerIndex = Math.floor(pointerAngle / sliceAngle) % participants.length;
        onSpinEnd(participants[winnerIndex].id);
      }
    };

    requestAnimationFrame(animate);
  };

  return (
    <div className="relative group wheel-shadow rounded-full">
      <canvas 
        ref={canvasRef} 
        width={500} 
        height={500} 
        className="max-w-full h-auto transition-transform"
      />
      
      {/* Visual Pointer - Professional Metallic Needle */}
      <div 
        className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 z-40 transition-transform duration-75 ${isTicking ? 'scale-110 -rotate-3' : 'scale-100 rotate-0'}`}
        style={{ filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.5))' }}
      >
        <svg width="46" height="60" viewBox="0 0 46 60" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Main Needle Body */}
          <path d="M23 58L42 18C44 14 42 6 36 6H10C4 6 2 14 4 18L23 58Z" fill="url(#needle-gradient)" stroke="#1a1a1a" strokeWidth="1.5" />
          
          {/* Internal Detail/Glow */}
          <path d="M23 52L38 19C39 17 38 9 34 9H12C8 9 7 17 8 19L23 52Z" fill="white" fillOpacity="0.15" />
          
          {/* Top Decorative Cap */}
          <circle cx="23" cy="14" r="6" fill="#1a1a1a" />
          <circle cx="23" cy="14" r="4" fill="url(#cap-gradient)" />
          
          <defs>
            <linearGradient id="needle-gradient" x1="23" y1="6" x2="23" y2="58" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FDE68A" />
              <stop offset="0.5" stopColor="#F59E0B" />
              <stop offset="1" stopColor="#B45309" />
            </linearGradient>
            <linearGradient id="cap-gradient" x1="23" y1="10" x2="23" y2="18" gradientUnits="userSpaceOnUse">
              <stop stopColor="#94a3b8" />
              <stop offset="1" stopColor="#334155" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Center Logo Area */}
      <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
        <div className="w-24 h-24 bg-[#0a0a0b] border-4 border-amber-500 rounded-full flex items-center justify-center shadow-2xl overflow-hidden animate-logo">
           <div className="text-2xl font-orbitron font-bold bg-gradient-to-t from-amber-600 to-amber-300 bg-clip-text text-transparent">ATC</div>
        </div>
      </div>
    </div>
  );
};

export default SpinnerWheel;
