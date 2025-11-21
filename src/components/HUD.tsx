"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/store/useStore";
import { motion, useSpring } from "framer-motion";
import {
  Cpu,
  Globe,
  Zap,
  Orbit,
  Twitter,
  Linkedin,
  Github,
  Volume2,
  VolumeX,
} from "lucide-react";
import SpotifyPlayer from "./SpotifyPlayer";

const DataRow = ({
  label,
  value,
  color = "text-cyan-400",
}: {
  label: string;
  value: string;
  color?: string;
}) => (
  <div className="flex justify-between items-center text-xs font-mono border-b border-cyan-900/30 pb-1 mb-1">
    <span className="text-cyan-500/70 tracking-widest">{label}</span>
    <span className={`${color} font-bold`}>{value}</span>
  </div>
);

const SceneIndicator = () => {
  const { activeScene } = useStore();
  const scenes = [
    { name: "ARC REACTOR", icon: Zap },
    { name: "GLOBAL NET", icon: Globe },
    { name: "SOLAR ARRAY", icon: Orbit },
  ];

  return (
    <div className="absolute top-4 md:top-10 left-1/2 -translate-x-1/2 flex gap-2 md:gap-4 pointer-events-auto w-full justify-center px-2">
      {scenes.map((scene, i) => {
        const isActive = i === activeScene;
        const Icon = scene.icon;
        return (
          <motion.div
            key={i}
            className={`flex items-center gap-1 md:gap-2 px-2 md:px-4 py-1 md:py-2 rounded border backdrop-blur-md transition-all duration-500 ${
              isActive
                ? "border-cyan-400 bg-cyan-900/40 shadow-[0_0_15px_rgba(0,243,255,0.3)]"
                : "border-cyan-900/30 bg-black/40 opacity-50"
            }`}
            animate={{ scale: isActive ? 1.1 : 1 }}
          >
            <Icon
              size={12}
              className={`${
                isActive ? "text-cyan-300" : "text-cyan-700"
              } md:w-[14px] md:h-[14px]`}
            />
            <span
              className={`text-[10px] md:text-xs font-bold tracking-widest ${
                isActive ? "text-cyan-100" : "text-cyan-800"
              } hidden sm:inline`}
            >
              {scene.name}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
};

const SoundToggle = () => {
  const { soundEnabled, setSoundEnabled } = useStore();

  return (
    <button
      onClick={() => setSoundEnabled(!soundEnabled)}
      className="text-cyan-500 hover:text-cyan-300 transition-colors duration-300 relative group"
      title={soundEnabled ? "Disable interaction sounds" : "Enable interaction sounds"}
    >
      {soundEnabled ? (
        <Volume2 size={16} className="md:w-5 md:h-5" />
      ) : (
        <VolumeX size={16} className="md:w-5 md:h-5" />
      )}
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-[10px] bg-black/80 text-cyan-400 rounded border border-cyan-500/30 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
        {soundEnabled ? "SOUNDS ON" : "SOUNDS OFF"}
      </span>
    </button>
  );
};

const SocialLinks = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-6 pointer-events-auto z-50"
    >
      <a
        href="https://x.com/suryansh777777"
        target="_blank"
        rel="noopener noreferrer"
        className="text-cyan-500 hover:text-cyan-300 transition-colors duration-300"
      >
        <Twitter size={16} className="md:w-5 md:h-5" />
      </a>
      <a
        href="https://linkedin.com/in/suryansh777777"
        target="_blank"
        rel="noopener noreferrer"
        className="text-cyan-500 hover:text-cyan-300 transition-colors duration-300"
      >
        <Linkedin size={16} className="md:w-5 md:h-5" />
      </a>
      <a
        href="https://github.com/Suryansh777777/Jarvis-CV"
        target="_blank"
        rel="noopener noreferrer"
        className="text-cyan-500 hover:text-cyan-300 transition-colors duration-300"
      >
        <Github size={16} className="md:w-5 md:h-5" />
      </a>
      {/* Sound Toggle */}
      <div className="h-4 w-px bg-cyan-500/30" />
      <SoundToggle />
    </motion.div>
  );
};

export default function HUD() {
  const { faceLandmarks, hudState, updateHUD, nextScene, prevScene } =
    useStore();

  // Use Framer Motion springs for performant, smooth parallax without re-renders
  const offsetX = useSpring(0, { stiffness: 50, damping: 20 });
  const offsetY = useSpring(0, { stiffness: 50, damping: 20 });

  const [cpuUsage, setCpuUsage] = useState(35);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  // Touch Handling for Swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;

    if (Math.abs(diff) > 50) {
      if (diff > 0) nextScene(); // Swipe Left -> Next
      else prevScene(); // Swipe Right -> Prev
    }
    setTouchStart(null);
  };

  // Parallax Effect based on Face Position
  useEffect(() => {
    if (faceLandmarks && faceLandmarks.length > 0) {
      // Smooth follow
      const nose = faceLandmarks[1];
      const targetX = (nose.x - 0.5) * -30; // Inverted for mirror feel
      const targetY = (nose.y - 0.5) * -30;

      offsetX.set(targetX);
      offsetY.set(targetY);
    }
  }, [faceLandmarks, offsetX, offsetY]);

  // Simulation Data
  useEffect(() => {
    const interval = setInterval(() => {
      updateHUD({
        powerLevel: Math.floor(95 + Math.random() * 5),
        systemStatus: Math.random() > 0.9 ? "WARNING" : "NOMINAL",
      });
      setCpuUsage(Math.floor(Math.random() * 20 + 30));
    }, 1000);
    return () => clearInterval(interval);
  }, [updateHUD]);

  return (
    <div
      className="absolute inset-0 z-20 overflow-hidden touch-none"
      style={{
        perspective: "1000px",
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Moving Container with Parallax */}
      <motion.div
        className="w-full h-full relative"
        style={{ x: offsetX, y: offsetY }}
      >
        {/* Scene Indicator (Top Center) */}
        <SceneIndicator />

        {/* TOP LEFT: System Core */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute top-20 left-4 md:top-10 md:left-10 w-40 md:w-64 holographic-panel p-2 md:p-4 rounded-tl-2xl clip-corner-br"
        >
          <div className="flex items-center gap-2 mb-2 border-b border-cyan-500/30 pb-2">
            <Cpu className="text-cyan-400 animate-pulse" size={18} />
            <span className="text-[10px] md:text-sm font-bold text-cyan-300 tracking-[0.2em]">
              CORE SYSTEMS
            </span>
          </div>
          <DataRow label="CPU" value={`${cpuUsage}%`} />
          <DataRow label="MEM" value="16.4 TB" />
          <DataRow label="NET" value="SECURE" color="text-green-400" />

          <div className="mt-2 flex gap-1">
            {[...Array(10)].map((_, i) => (
              <div
                key={i}
                className={`h-1 w-full rounded-sm ${
                  i < 7 ? "bg-cyan-500" : "bg-cyan-900"
                }`}
              />
            ))}
          </div>
        </motion.div>

        {/* TOP RIGHT: J.A.R.V.I.S Identity */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute top-20 right-4 md:top-10 md:right-10 text-right"
        >
          <h1 className="text-2xl md:text-4xl font-bold text-white tracking-[0.2em] text-glow opacity-90">
            J.A.R.V.I.S
          </h1>
          <div className="flex items-center justify-end gap-2 text-cyan-400 text-[10px] md:text-xs tracking-[0.4em] mt-1">
            <span className="w-2 h-2 bg-cyan-400 rounded-full animate-ping" />
            ONLINE
          </div>
        </motion.div>

        {/* BOTTOM RIGHT: Environmental Data */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-24 right-4 md:bottom-20 md:right-10 w-48 md:w-72 holographic-panel p-2 md:p-4 clip-corner-tl"
        >
          <div className="flex justify-between items-end mb-2 md:mb-4">
            <span className="text-2xl md:text-4xl font-thin text-white font-tech">
              {hudState.powerLevel}%
            </span>
            <span className="text-[10px] md:text-xs text-cyan-500 mb-1">
              OUTPUT CAPACITY
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[10px] md:text-xs text-cyan-400">
              <span>THREAT ANALYSIS</span>
              <span
                className={
                  hudState.threatLevel === "MINIMAL"
                    ? "text-green-400"
                    : "text-red-500"
                }
              >
                {hudState.threatLevel}
              </span>
            </div>
            <div className="h-1 bg-cyan-900/50 w-full">
              <motion.div
                className="h-full bg-linear-to-r from-cyan-500 to-blue-600"
                initial={{ width: 0 }}
                animate={{ width: "30%" }}
              />
            </div>
          </div>
        </motion.div>

        {/* BOTTOM LEFT: Log Stream */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute bottom-24 left-4 md:bottom-20 md:left-10 w-40 md:w-64 text-[10px] md:text-xs font-mono text-cyan-500/60 space-y-1 hidden sm:block"
        >
          <p>&gt; Initializing biometric sensors...</p>
          <p>&gt; Connecting to satellite array...</p>
          <p>&gt; Hand tracking active.</p>
          <p className="text-cyan-300 animate-pulse">&gt; {hudState.message}</p>
        </motion.div>

        {/* MIDDLE LEFT: Spotify Player */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute top-1/2 left-4 md:left-10 -translate-y-1/2 w-48 md:w-72 z-30"
        >
          <SpotifyPlayer />
        </motion.div>

        {/* CENTER: Reticle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] md:w-[400px] md:h-[400px] opacity-20 pointer-events-none">
          <div className="absolute inset-0 border border-cyan-500/30 rounded-full scale-[0.8]" />
          <div className="absolute inset-0 border-l border-r border-cyan-500/20 rounded-full animate-[spin_10s_linear_infinite]" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-4 bg-cyan-500/50" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0.5 h-4 bg-cyan-500/50" />
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-0.5 bg-cyan-500/50" />
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-0.5 bg-cyan-500/50" />
        </div>
      </motion.div>

      {/* Social Links (Bottom Center) */}
      <SocialLinks />

      {/* Static Overlays (Vignette/Scanlines) */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_50%,black_120%)] pointer-events-none opacity-50" />
      <div className="absolute inset-0 scanline opacity-10 pointer-events-none" />
    </div>
  );
}
