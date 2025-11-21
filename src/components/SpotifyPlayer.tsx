"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { Music, Play, Pause, SkipForward, SkipBack, Volume2 } from "lucide-react";

interface TrackInfo {
  name: string;
  artist: string;
  album: string;
  image: string;
  duration: number;
  progress: number;
  isPlaying: boolean;
}

interface UserProfile {
  display_name: string;
  images: Array<{ url: string }>;
}

interface SpotifyPlayerProps {
  className?: string;
}

export default function SpotifyPlayer({ className = "" }: SpotifyPlayerProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [trackInfo, setTrackInfo] = useState<TrackInfo | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [volume, setVolume] = useState(50);
  const [isLoading, setIsLoading] = useState(false);
  const playerRef = useRef<Spotify.Player | null>(null);
  const deviceIdRef = useRef<string | null>(null);
  const tokenRef = useRef<string | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Spotify Web Playback SDK
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check for callback code and handle token exchange
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const error = params.get("error");

      if (error || params.get("spotify_error")) {
        const errorMsg = error || params.get("spotify_error");
        console.error("Spotify auth error:", errorMsg);
        
        let userMessage = `Spotify authentication failed: ${errorMsg}`;
        if (errorMsg === "INVALID_CLIENT" || errorMsg?.includes("redirect")) {
          userMessage = `Invalid redirect URI. Please add this exact URI in your Spotify Dashboard:\n\nhttp://localhost:3000/api/spotify/callback\n\nSee SPOTIFY_REDIRECT_URI_FIX.md for instructions.`;
        }
        
        alert(userMessage);
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }

      if (code) {
        // Get code verifier from sessionStorage
        const codeVerifier = sessionStorage.getItem("spotify_code_verifier");
        
        if (!codeVerifier) {
          console.error("No code verifier found");
          window.history.replaceState({}, document.title, window.location.pathname);
          return;
        }

        try {
          // Exchange code for token via API route
          const response = await fetch("/api/spotify/token", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ code, codeVerifier }),
          });

          const data = await response.json();

          if (response.ok && data.access_token) {
            tokenRef.current = data.access_token;
            setIsConnected(true);
            initializePlayer(data.access_token);
            // Clean URL and sessionStorage
            sessionStorage.removeItem("spotify_code_verifier");
            window.history.replaceState({}, document.title, window.location.pathname);
          } else {
            console.error("Token exchange failed:", data);
          }
        } catch (error) {
          console.error("Token exchange error:", error);
        }
        return;
      }

      // Check if already connected (has token in cookie)
      const checkConnection = async () => {
        try {
          const response = await fetch("/api/spotify/me");
          if (response.ok) {
            const data = await response.json();
            if (data.accessToken) {
              tokenRef.current = data.accessToken;
              setIsConnected(true);
              initializePlayer(data.accessToken);
            }
          }
        } catch (error) {
          console.log("Not connected to Spotify");
        }
      };

      checkConnection();
    };

    handleCallback();

    // Load Spotify Web Playback SDK script
    const script = document.createElement("script");
    script.src = "https://sdk.scdn.co/spotify-player.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      if (playerRef.current) {
        playerRef.current.disconnect();
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  const initializePlayer = (token: string) => {
    if (typeof window === "undefined" || !(window as any).Spotify) {
      setTimeout(() => initializePlayer(token), 100);
      return;
    }

    const Spotify = (window as any).Spotify;

    const player = new Spotify.Player({
      name: "JARVIS Music Player",
      getOAuthToken: (cb: (token: string) => void) => {
        cb(token);
      },
      volume: volume / 100,
    });

    playerRef.current = player;

    // Error handling
    player.addListener("initialization_error", ({ message }: { message: string }) => {
      console.error("Initialization Error:", message);
    });

    player.addListener("authentication_error", ({ message }: { message: string }) => {
      console.error("Authentication Error:", message);
      setIsConnected(false);
    });

    player.addListener("account_error", ({ message }: { message: string }) => {
      console.error("Account Error:", message);
    });

    // Ready event
    player.addListener("ready", ({ device_id }: { device_id: string }) => {
      console.log("Ready with Device ID", device_id);
      deviceIdRef.current = device_id;
      setIsConnected(true);
      transferPlayback(device_id, token);
      fetchCurrentTrack(token);
      fetchUserProfile(token);
    });

    // Not ready event
    player.addListener("not_ready", ({ device_id }: { device_id: string }) => {
      console.log("Device ID has gone offline", device_id);
    });

    // Player state changed
    player.addListener("player_state_changed", (state: any) => {
      if (!state) return;

      const track = state.track_window.current_track;
      setTrackInfo({
        name: track.name,
        artist: track.artists.map((a: any) => a.name).join(", "),
        album: track.album.name,
        image: track.album.images[0]?.url || "",
        duration: state.duration,
        progress: state.position,
        isPlaying: !state.paused,
      });
    });

    // Connect to the player
    player.connect();
  };

  const transferPlayback = async (deviceId: string, token: string) => {
    try {
      await fetch("https://api.spotify.com/v1/me/player", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ device_ids: [deviceId] }),
      });
    } catch (error) {
      console.error("Error transferring playback:", error);
    }
  };

  const fetchCurrentTrack = async (token: string) => {
    try {
      const response = await fetch("https://api.spotify.com/v1/me/player", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.item) {
          setTrackInfo({
            name: data.item.name,
            artist: data.item.artists.map((a: any) => a.name).join(", "),
            album: data.item.album.name,
            image: data.item.album.images[0]?.url || "",
            duration: data.item.duration_ms,
            progress: data.progress_ms || 0,
            isPlaying: data.is_playing,
          });
        }
      }
    } catch (error) {
      console.error("Error fetching current track:", error);
    }
  };

  const fetchUserProfile = async (token: string) => {
    try {
      const response = await fetch("https://api.spotify.com/v1/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUserProfile({
          display_name: data.display_name || "User",
          images: data.images || [],
        });
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  const handleConnect = async () => {
    const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
    if (!clientId) {
      console.error("Spotify Client ID not configured");
      alert("Spotify Client ID not configured. Please check your .env.local file.");
      return;
    }

    const redirectUri =
      process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI ||
      "http://localhost:3000/api/spotify/callback";

    // Log for debugging
    console.log("Connecting to Spotify with:", {
      clientId,
      redirectUri,
    });

    // Use PKCE flow
    try {
      const { redirectToAuthCodeFlow } = await import("@/utils/spotifyAuth");
      await redirectToAuthCodeFlow(clientId);
    } catch (error) {
      console.error("Error initiating Spotify auth:", error);
      alert(
        "Failed to connect to Spotify. Please check:\n1. Redirect URI is added in Spotify Dashboard\n2. Redirect URI matches exactly: " +
          redirectUri
      );
    }
  };

  const handlePlayPause = async () => {
    const player = playerRef.current;
    if (!player || !tokenRef.current) return;

    try {
      if (trackInfo?.isPlaying) {
        await player.pause();
      } else {
        await player.resume();
      }
    } catch (error) {
      console.error("Error toggling playback:", error);
    }
  };

  const handleNext = async () => {
    const player = playerRef.current;
    if (!player) return;
    try {
      await player.nextTrack();
    } catch (error) {
      console.error("Error skipping to next track:", error);
    }
  };

  const handlePrevious = async () => {
    const player = playerRef.current;
    if (!player) return;
    try {
      await player.previousTrack();
    } catch (error) {
      console.error("Error skipping to previous track:", error);
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    const player = playerRef.current;
    if (player) {
      try {
        player.setVolume(newVolume / 100);
      } catch (error) {
        console.error("Error setting volume:", error);
      }
    }
  };

  // Update progress bar
  useEffect(() => {
    if (trackInfo?.isPlaying && trackInfo.duration > 0) {
      progressIntervalRef.current = setInterval(() => {
        setTrackInfo((prev) => {
          if (!prev) return null;
          const newProgress = Math.min(prev.progress + 1000, prev.duration);
          return { ...prev, progress: newProgress };
        });
      }, 1000);
    } else {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [trackInfo?.isPlaying, trackInfo?.duration]);

  if (!isConnected) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`holographic-panel p-3 md:p-4 rounded-lg ${className}`}
      >
        <div className="flex items-center gap-2 mb-2 border-b border-cyan-500/30 pb-2">
          <Music className="text-cyan-400" size={16} />
          <span className="text-[10px] md:text-xs font-bold text-cyan-300 tracking-[0.2em]">
            AUDIO SYSTEMS
          </span>
        </div>
        <button
          onClick={handleConnect}
          className="w-full px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 rounded text-cyan-300 text-xs font-mono transition-all duration-300"
        >
          CONNECT SPOTIFY
        </button>
      </motion.div>
    );
  }

  const progressPercent = trackInfo
    ? (trackInfo.progress / trackInfo.duration) * 100
    : 0;

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`holographic-panel p-3 md:p-4 rounded-lg ${className}`}
    >
      <div className="flex items-center gap-2 mb-3 border-b border-cyan-500/30 pb-2">
        <Music className="text-cyan-400 animate-pulse" size={16} />
        <span className="text-[10px] md:text-xs font-bold text-cyan-300 tracking-[0.2em]">
          AUDIO SYSTEMS
        </span>
        {userProfile && (
          <div className="ml-auto flex items-center gap-2">
            {userProfile.images[0] && (
              <img
                src={userProfile.images[0].url}
                alt={userProfile.display_name}
                className="w-6 h-6 rounded-full border border-cyan-500/30"
              />
            )}
            <span className="text-[9px] text-cyan-400/70">
              {userProfile.display_name}
            </span>
          </div>
        )}
      </div>

      {trackInfo ? (
        <>
          {/* Track Info */}
          <div className="flex gap-3 mb-3">
            {trackInfo.image && (
              <img
                src={trackInfo.image}
                alt={trackInfo.album}
                className="w-12 h-12 md:w-16 md:h-16 rounded border border-cyan-500/30"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[10px] md:text-xs font-bold text-cyan-100 truncate">
                {trackInfo.name}
              </p>
              <p className="text-[9px] md:text-[10px] text-cyan-400/70 truncate">
                {trackInfo.artist}
              </p>
              <p className="text-[8px] text-cyan-500/50 truncate">{trackInfo.album}</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-3">
            <div className="h-1 bg-cyan-900/50 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-linear-to-r from-cyan-500 to-blue-600"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <div className="flex justify-between text-[8px] text-cyan-500/60 mt-1">
              <span>{formatTime(trackInfo.progress)}</span>
              <span>{formatTime(trackInfo.duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <button
              onClick={handlePrevious}
              className="p-2 hover:bg-cyan-500/20 rounded border border-cyan-500/30 transition-all"
            >
              <SkipBack size={14} className="text-cyan-400" />
            </button>
            <button
              onClick={handlePlayPause}
              className="p-2 hover:bg-cyan-500/20 rounded border border-cyan-500/30 transition-all"
            >
              {trackInfo.isPlaying ? (
                <Pause size={16} className="text-cyan-400" />
              ) : (
                <Play size={16} className="text-cyan-400" />
              )}
            </button>
            <button
              onClick={handleNext}
              className="p-2 hover:bg-cyan-500/20 rounded border border-cyan-500/30 transition-all"
            >
              <SkipForward size={14} className="text-cyan-400" />
            </button>
          </div>

          {/* Volume Control */}
          <div className="flex items-center gap-2">
            <Volume2 size={12} className="text-cyan-400/70" />
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => handleVolumeChange(Number(e.target.value))}
              className="flex-1 h-1 bg-cyan-900/50 rounded-full appearance-none cursor-pointer accent-cyan-500"
            />
            <span className="text-[8px] text-cyan-500/60 w-8">{volume}%</span>
          </div>
        </>
      ) : (
        <div className="text-center py-4">
          <p className="text-[10px] text-cyan-500/60">No track playing</p>
        </div>
      )}
    </motion.div>
  );
}

