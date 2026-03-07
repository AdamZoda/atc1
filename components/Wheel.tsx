import { motion } from 'framer-motion';

interface Reward {
    id: string;
    label: string;
    points: number;
    color: string;
    probability_weight: number;
}

interface WheelProps {
    rewards: Reward[];
    spinning: boolean;
    rotation: number;
    manualLayout?: string[];
}

export default function Wheel({ rewards, spinning, rotation, manualLayout }: WheelProps) {
    const numSegments = rewards.length;

    const TOTAL_SEGMENTS = 24;
    const segmentAngle = 360 / TOTAL_SEGMENTS;

    // Build the same interlaced structure as in WheelGame.tsx to maintain visual sync
    const getVirtualSegments = () => {
        if (rewards.length === 0) return [];

        // If manual layout is provided, use it
        if (manualLayout && manualLayout.length === TOTAL_SEGMENTS) {
            return manualLayout.map(id => rewards.findIndex(r => r.id === id)).map(idx => idx === -1 ? 0 : idx);
        }

        const totalWeight = rewards.reduce((sum, r) => sum + (r.probability_weight || 1), 0);

        let virtual: number[] = [];
        rewards.forEach((reward, index) => {
            const count = Math.max(1, Math.round(((reward.probability_weight || 1) / totalWeight) * TOTAL_SEGMENTS));
            for (let i = 0; i < count; i++) virtual.push(index);
        });

        while (virtual.length < TOTAL_SEGMENTS) virtual.push(0);
        if (virtual.length > TOTAL_SEGMENTS) virtual = virtual.slice(0, TOTAL_SEGMENTS);

        const interlaced = new Array(TOTAL_SEGMENTS);
        let currentPos = 0;
        virtual.forEach((val) => {
            while (interlaced[currentPos] !== undefined) {
                currentPos = (currentPos + 1) % TOTAL_SEGMENTS;
            }
            interlaced[currentPos] = val;
            currentPos = (currentPos + 7) % TOTAL_SEGMENTS;
        });
        return interlaced;
    };

    const segments = getVirtualSegments();

    if (numSegments < 2) {
        return (
            <div className="w-full aspect-square max-w-[400px] mx-auto rounded-full bg-black/50 border border-white/10 flex items-center justify-center">
                <p className="text-gray-400 font-cinzel text-center px-6">La roue est en cours de configuration...</p>
            </div>
        );
    }

    // SVG Path calculation
    const createSegmentPath = (index: number) => {
        const startAngle = (index * segmentAngle * Math.PI) / 180;
        const endAngle = ((index + 1) * segmentAngle * Math.PI) / 180;
        const radius = 50;
        const cx = 50;
        const cy = 50;
        const x1 = cx + radius * Math.cos(startAngle);
        const y1 = cy + radius * Math.sin(startAngle);
        const x2 = cx + radius * Math.cos(endAngle);
        const y2 = cy + radius * Math.sin(endAngle);
        const largeArcFlag = segmentAngle > 180 ? 1 : 0;
        return `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
    };

    return (
        <div className="relative w-full aspect-square max-w-[400px] mx-auto filter drop-shadow-[0_0_30px_rgba(212,175,55,0.2)]">
            {/* Outer Glow / Frame */}
            <div className="absolute inset-0 rounded-full border-4 border-luxury-gold/50 shadow-[0_0_50px_rgba(212,175,55,0.3)] bg-black/80 z-0"></div>

            {/* Target Pointer (Top) */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-10 z-30 filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.8)]">
                <svg viewBox="0 0 100 100" className="w-full h-full text-white fill-current">
                    <polygon points="50,100 20,0 80,0" />
                </svg>
            </div>

            {/* The Spinning Wheel Container */}
            <div className="absolute inset-2 rounded-full overflow-hidden z-10 border-4 border-black">
                <motion.div
                    className="w-full h-full relative"
                    style={{ willChange: 'transform' }}
                    animate={{ rotate: rotation }}
                    transition={{
                        duration: spinning ? 6 : 0, // Slightly longer spin for 24 segments
                        ease: [0.15, 0.9, 0.2, 1],
                    }}
                >
                    <svg viewBox="0 0 100 100" className="w-full h-full absolute inset-0 -rotate-90">
                        {segments.map((rewardIdx, i) => (
                            <path
                                key={i}
                                d={createSegmentPath(i)}
                                fill={rewards[rewardIdx]?.color || '#333'}
                                stroke="#000"
                                strokeWidth="0.2"
                            />
                        ))}
                    </svg>

                    <div className="absolute inset-0 w-full h-full rounded-full pointer-events-none">
                        {segments.map((rewardIdx, i) => {
                            const angle = (i * segmentAngle) + (segmentAngle / 2) - 90;
                            const reward = rewards[rewardIdx];
                            if (!reward) return null;

                            return (
                                <div
                                    key={i}
                                    className="absolute top-1/2 left-1/2 w-[45%] h-6 -translate-y-1/2 origin-left flex items-center justify-end pr-2"
                                    style={{ transform: `translateY(-50%) rotate(${angle}deg)` }}
                                >
                                    <span
                                        className="font-bold text-white whitespace-nowrap"
                                        style={{
                                            fontSize: '0.5rem',
                                            textShadow: '1px 1px 0 #000',
                                            opacity: 0.9
                                        }}
                                    >
                                        {reward.label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </motion.div>
            </div>

            {/* Inner Center Circle */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-black border-4 border-luxury-gold flex items-center justify-center z-20 shadow-inner overflow-hidden">
                <img
                    src="https://i.postimg.cc/L4wgGYg6/ATC.png"
                    alt="ATC"
                    className="w-10 h-10 object-contain"
                />
            </div>
        </div>
    );
}
