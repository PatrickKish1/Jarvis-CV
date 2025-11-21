/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useRef } from "react";
import { useStore, GestureType } from "@/store/useStore";
import {
  playSelectSound,
  playHoverSound,
  playEngageSound,
  setSoundsEnabled,
  // playErrorSound,
} from "@/utils/audio";
import type { Results as HandsResults } from "@mediapipe/hands";
import type { Results as FaceMeshResults } from "@mediapipe/face_mesh";

export default function WebcamProcessor() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const {
    setFaceLandmarks,
    setHands,
    setGestures,
    setGlobeRotation,
    setGlobeScale,
    setGlobePosition,
    updateHandUI,
    nextScene,
    prevScene,
    soundEnabled,
  } = useStore();

  // Sync audio utility with store state
  useEffect(() => {
    setSoundsEnabled(soundEnabled);
  }, [soundEnabled]);

  // Gesture state tracking
  const prevHandPos = useRef<{ x: number; y: number } | null>(null);
  const prevPinchDist = useRef<number | null>(null);
  const prevGestureLeft = useRef<GestureType>("IDLE");
  const prevGestureRight = useRef<GestureType>("IDLE");
  const swipeCooldown = useRef<number>(0);
  
  // VR-style controller tracking
  // Continuous tracking - hands are always tracked, gestures just change behavior
  const leftHandPrevPos = useRef<{ x: number; y: number } | null>(null);
  const rightHandPrevPos = useRef<{ x: number; y: number } | null>(null);
  const leftHandPrevOrientation = useRef<number | null>(null);
  const rightHandPrevOrientation = useRef<number | null>(null);
  
  // Controller activation states
  const leftControllerActive = useRef<boolean>(false);
  const rightControllerActive = useRef<boolean>(false);
  const leftControllerBasePos = useRef<{ x: number; y: number; z: number } | null>(null);
  const rightControllerBasePos = useRef<{ x: number; y: number; z: number } | null>(null);
  const leftControllerScreenPos = useRef<{ x: number; y: number } | null>(null);
  const rightControllerScreenPos = useRef<{ x: number; y: number } | null>(null);
  
  // Two-hand scaling (any gesture that brings hands together/apart)
  const scaleBaseDist = useRef<number | null>(null);
  const isScaling = useRef<boolean>(false);
  const scaleBuffer = useRef<number[]>([]);
  
  // Rotation tracking (hand orientation changes)
  const rotationBuffer = useRef<{ x: number; y: number }[]>([]);

  useEffect(() => {
    let camera: any = null;
    let hands: any = null;
    let faceMesh: any = null;

    const initMediaPipe = async () => {
      if (!videoRef.current || !canvasRef.current) return;

      const videoElement = videoRef.current;
      const canvasElement = canvasRef.current;
      const canvasCtx = canvasElement.getContext("2d");

      if (!canvasCtx) return;

      // Dynamic imports
      const { Camera } = await import("@mediapipe/camera_utils");
      const { Hands, HAND_CONNECTIONS } = await import("@mediapipe/hands");
      const { drawConnectors, drawLandmarks } = await import(
        "@mediapipe/drawing_utils"
      );
      
      // Try to import FaceMesh - may fail due to WASM compatibility
      let FaceMesh: any = null;
      try {
        const faceMeshModule = await import("@mediapipe/face_mesh");
        FaceMesh = faceMeshModule.FaceMesh;
      } catch (importError) {
        console.warn("Failed to import FaceMesh module:", importError);
        console.warn("Face tracking will be disabled. Hand gestures will still work.");
      }

      // Initialize Hands
      hands = new Hands({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        },
      });

      hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.6,
      });

      hands.onResults(onHandsResults);

      // Initialize FaceMesh with error handling
      if (FaceMesh) {
        try {
          // Delay FaceMesh initialization slightly to avoid WASM conflicts
          await new Promise((resolve) => setTimeout(resolve, 200));
          
          faceMesh = new FaceMesh({
            locateFile: (file: string) => {
              return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
            },
          });

          faceMesh.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5,
          });

          faceMesh.onResults(onFaceResults);
          console.log("FaceMesh initialized successfully");
        } catch (error) {
          console.warn("FaceMesh initialization failed (WASM compatibility issue). Continuing without face tracking:", error);
          console.warn("Hand gestures will still work. Face tracking is optional.");
          faceMesh = null;
          // Clear face landmarks so HUD doesn't try to use them
          setFaceLandmarks(null);
        }
      } else {
        console.info("FaceMesh module not available. Face tracking disabled.");
        setFaceLandmarks(null);
      }

      // Camera setup
      camera = new Camera(videoElement, {
        onFrame: async () => {
          try {
            // Process hands first (more critical)
            if (hands) {
              try {
                await hands.send({ image: videoElement });
              } catch (handError) {
                console.warn("Hands processing error:", handError);
              }
            }
            
            // Process face mesh if available (optional feature)
            if (faceMesh) {
              try {
                await faceMesh.send({ image: videoElement });
              } catch (faceError) {
                // Silently handle face mesh errors - it's optional
                // Don't spam console with errors
              }
            }
          } catch (error) {
            console.warn("Frame processing error:", error);
          }
        },
        width: 1280,
        height: 720,
      });

      camera.start();

      function onFaceResults(results: FaceMeshResults) {
        try {
          if (
            results.multiFaceLandmarks &&
            results.multiFaceLandmarks.length > 0
          ) {
            setFaceLandmarks(results.multiFaceLandmarks[0]);
          } else {
            setFaceLandmarks(null);
          }
        } catch (error) {
          // Silently handle face results errors
          setFaceLandmarks(null);
        }
      }

      function onHandsResults(results: HandsResults) {
        if (!canvasCtx) return;
        canvasCtx.save();
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

        // Draw only the video feed (clean look)
        canvasCtx.drawImage(
          results.image,
          0,
          0,
          canvasElement.width,
          canvasElement.height
        );

        // Draw Face HUD if available
        const faceLandmarks = useStore.getState().faceLandmarks;
        if (faceLandmarks) {
          drawFaceHUD(canvasCtx, faceLandmarks);
        }

        let leftHand = null;
        let rightHand = null;
        let leftGesture: GestureType = "IDLE";
        let rightGesture: GestureType = "IDLE";

        if (results.multiHandLandmarks) {
          for (const [
            index,
            landmarks,
          ] of results.multiHandLandmarks.entries()) {
            // Draw Sci-Fi Skeleton
            drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {
              color: "rgba(0, 243, 255, 0.6)",
              lineWidth: 2,
            });
            drawLandmarks(canvasCtx, landmarks, {
              color: "rgba(255, 255, 255, 0.8)",
              fillColor: "rgba(0, 243, 255, 0.8)",
              radius: 2,
              lineWidth: 1,
            });

            const label = results.multiHandedness[index]?.label;
            const gesture = detectGesture(landmarks);

            // Update Hand UI Position (Palm Center)
            // Landmark 9 is the middle finger knuckle, usually stable center of palm
            const palmX = landmarks[9].x;
            const palmY = landmarks[9].y;

            if (label === "Left") {
              leftHand = landmarks;
              leftGesture = gesture;
              updateHandUI("left", {
                visible: true,
                x: palmX,
                y: palmY,
                gesture: gesture,
              });
            }
            if (label === "Right") {
              rightHand = landmarks;
              rightGesture = gesture;
              updateHandUI("right", {
                visible: true,
                x: palmX,
                y: palmY,
                gesture: gesture,
              });
            }
          }
        }

        // Hide UI if hand lost
        if (!leftHand) updateHandUI("left", { visible: false });
        if (!rightHand) updateHandUI("right", { visible: false });

        // Sound Effects on Gesture Change
        if (leftGesture !== prevGestureLeft.current && leftGesture !== "IDLE") {
          if (leftGesture === "GRAB") playEngageSound();
          else playSelectSound();
        }
        if (
          rightGesture !== prevGestureRight.current &&
          rightGesture !== "IDLE"
        ) {
          if (rightGesture === "GRAB") playEngageSound();
          else playSelectSound();
        }

        prevGestureLeft.current = leftGesture;
        prevGestureRight.current = rightGesture;

        setHands(leftHand, rightHand);
        setGestures(leftGesture, rightGesture);
        processInteraction(leftHand, rightHand, leftGesture, rightGesture);

        canvasCtx.restore();
      }

      function drawFaceHUD(ctx: CanvasRenderingContext2D, landmarks: any[]) {
        const connect = (i1: number, i2: number) => {
          const p1 = landmarks[i1];
          const p2 = landmarks[i2];
          ctx.beginPath();
          ctx.moveTo(p1.x * ctx.canvas.width, p1.y * ctx.canvas.height);
          ctx.lineTo(p2.x * ctx.canvas.width, p2.y * ctx.canvas.height);
          ctx.stroke();
        };

        ctx.strokeStyle = "rgba(0, 243, 255, 0.4)";
        ctx.lineWidth = 1;

        // Center Line
        connect(10, 152);

        // Bounding Box / Target Lock
        const x = landmarks[234].x * ctx.canvas.width; // Left cheek
        const y = landmarks[10].y * ctx.canvas.height; // Top head
        const w = (landmarks[454].x - landmarks[234].x) * ctx.canvas.width; // Width
        const h = (landmarks[152].y - landmarks[10].y) * ctx.canvas.height; // Height

        ctx.strokeStyle = "rgba(0, 243, 255, 0.8)";
        ctx.lineWidth = 2;
        const pad = 20;

        // Corners only
        const bx = x - pad;
        const by = y - pad;
        const bw = w + pad * 2;
        const bh = h + pad * 2;
        const len = 20;

        ctx.beginPath();
        // TL
        ctx.moveTo(bx, by + len);
        ctx.lineTo(bx, by);
        ctx.lineTo(bx + len, by);
        // TR
        ctx.moveTo(bx + bw - len, by);
        ctx.lineTo(bx + bw, by);
        ctx.lineTo(bx + bw, by + len);
        // BL
        ctx.moveTo(bx, by + bh - len);
        ctx.lineTo(bx, by + bh);
        ctx.lineTo(bx + len, by + bh);
        // BR
        ctx.moveTo(bx + bw - len, by + bh);
        ctx.lineTo(bx + bw, by + bh);
        ctx.lineTo(bx + bw, by + bh - len);
        ctx.stroke();

        // Label
        ctx.font = "12px 'Share Tech Mono'";
        ctx.fillStyle = "rgba(0, 243, 255, 0.9)";
        ctx.fillText("TARGET LOCKED", bx, by - 5);
      }

      /**
       * Calculate hand orientation angle (for rotation detection)
       * Uses wrist to middle finger knuckle as reference
       */
      function getHandOrientation(landmarks: any[]): number {
        const wrist = landmarks[0];
        const middleKnuckle = landmarks[9]; // Middle finger MCP
        const angle = Math.atan2(
          middleKnuckle.y - wrist.y,
          middleKnuckle.x - wrist.x
        );
        return angle;
      }

      /**
       * Calculate average finger tip distance from palm center
       * Used to detect closing/opening palms
       */
      function getFingerSpread(landmarks: any[]): number {
        const palmCenter = landmarks[9]; // Middle finger MCP (palm center)
        const thumbTip = landmarks[4];
        const indexTip = landmarks[8];
        const middleTip = landmarks[12];
        const ringTip = landmarks[16];
        const pinkyTip = landmarks[20];
        
        const distances = [
          Math.hypot(thumbTip.x - palmCenter.x, thumbTip.y - palmCenter.y),
          Math.hypot(indexTip.x - palmCenter.x, indexTip.y - palmCenter.y),
          Math.hypot(middleTip.x - palmCenter.x, middleTip.y - palmCenter.y),
          Math.hypot(ringTip.x - palmCenter.x, ringTip.y - palmCenter.y),
          Math.hypot(pinkyTip.x - palmCenter.x, pinkyTip.y - palmCenter.y),
        ];
        
        return distances.reduce((a, b) => a + b, 0) / distances.length;
      }

      function detectGesture(landmarks: any[]): GestureType {
        const thumbTip = landmarks[4];
        const indexTip = landmarks[8];
        const middleTip = landmarks[12];
        const ringTip = landmarks[16];
        const pinkyTip = landmarks[20];
        const wrist = landmarks[0];

        // Helper to check if finger is extended (tip further from wrist than PIP)
        const isExtended = (tip: any, pip: number) => {
          const pipMark = landmarks[pip];
          const tipDist = Math.hypot(tip.x - wrist.x, tip.y - wrist.y);
          const pipDist = Math.hypot(pipMark.x - wrist.x, pipMark.y - wrist.y);
          return tipDist > pipDist * 1.1;
        };

        const indexExt = isExtended(indexTip, 6);
        const middleExt = isExtended(middleTip, 10);
        const ringExt = isExtended(ringTip, 14);
        const pinkyExt = isExtended(pinkyTip, 18);

        // Distance between thumb and index (for pinch detection)
        const thumbIndexDist = Math.hypot(
          thumbTip.x - indexTip.x,
          thumbTip.y - indexTip.y
        );

        // Calculate finger spread (average distance of all fingers from palm)
        const fingerSpread = getFingerSpread(landmarks);

        // PINCH detection - multiple methods:
        // 1. Thumb-index pinch (classic pinch)
        // 2. All fingers close to palm (closing palm)
        const isPinching = thumbIndexDist < 0.06 || fingerSpread < 0.08;
        
        if (isPinching) return "PINCH";

        // Palm open - all fingers clearly extended
        if (indexExt && middleExt && ringExt && pinkyExt) return "PALM_OPEN";

        // Grab - all fingers closed (fist)
        const thumbClosed = thumbIndexDist < 0.1;
        if (!indexExt && !middleExt && !ringExt && !pinkyExt && thumbClosed) return "GRAB";

        // Point - only index extended
        if (indexExt && !middleExt && !ringExt && !pinkyExt) return "POINT";

        // Victory - index and middle extended
        if (indexExt && middleExt && !ringExt && !pinkyExt) return "VICTORY";

        return "IDLE";
      }

      /**
       * VR-Style Controller System
       * Hands act as controllers when in GRAB gesture
       * Hand position directly maps to object position (like VR remotes)
       */
      function processInteraction(
        left: any[] | null,
        right: any[] | null,
        leftGesture: GestureType,
        rightGesture: GestureType
      ) {
        const now = Date.now();
        const currentScale = useStore.getState().globeScale;
        const currentPos = useStore.getState().globePosition;

        // ============================================
        // PRIORITY 1: Two-Hand Scaling (any gesture when both hands present)
        // ============================================
        // Detect scaling when both hands are present and moving together/apart
        // Works with PINCH, GRAB, or any gesture - just tracks distance
        if (left && right) {
          const leftPalm = { x: left[9].x, y: left[9].y };
          const rightPalm = { x: right[9].x, y: right[9].y };
          
          const dist = Math.hypot(
            leftPalm.x - rightPalm.x,
            leftPalm.y - rightPalm.y
          );

          // Activate scaling if both hands are in PINCH or if distance changes significantly
          const bothPinching = leftGesture === "PINCH" && rightGesture === "PINCH";
          const shouldScale = bothPinching || 
            (leftGesture !== "IDLE" && rightGesture !== "IDLE" && 
             Math.abs(dist - (scaleBaseDist.current || dist)) > 0.05);

          if (shouldScale) {
            if (!isScaling.current) {
              scaleBaseDist.current = dist;
              isScaling.current = true;
              // Deactivate position controllers during scaling
              leftControllerActive.current = false;
              rightControllerActive.current = false;
            } else if (scaleBaseDist.current !== null) {
              // Simple zoom: hands apart = zoom in, hands together = zoom out
              const distanceChange = dist - scaleBaseDist.current;
              const scaleChange = distanceChange * 2.5; // Increased sensitivity
              
              scaleBuffer.current.push(scaleChange);
              if (scaleBuffer.current.length > 5) {
                scaleBuffer.current.shift();
              }
              
              const avgChange = scaleBuffer.current.reduce((a, b) => a + b, 0) / scaleBuffer.current.length;
              
              // Lower threshold for more responsive scaling
              if (Math.abs(avgChange) > 0.005) {
                const newScale = Math.max(0.3, Math.min(4, currentScale + avgChange));
                setGlobeScale(newScale);
                scaleBaseDist.current = dist; // Update base for continuous scaling
              }
            }
          } else {
            if (isScaling.current) {
              isScaling.current = false;
              scaleBaseDist.current = null;
              scaleBuffer.current = [];
            }
          }
        } else {
          if (isScaling.current) {
            isScaling.current = false;
            scaleBaseDist.current = null;
            scaleBuffer.current = [];
          }
        }

        // ============================================
        // PRIORITY 2: Continuous Hand Tracking & Controllers
        // ============================================
        // Track hands continuously, gestures determine behavior
        if (!isScaling.current) {
          // LEFT HAND - Continuous tracking
          if (left) {
            const palmScreenPos = { x: left[9].x, y: left[9].y };
            const handOrientation = getHandOrientation(left);
            
            // Activate controller on GRAB, PINCH, or POINT gesture
            // POINT = pointing gesture to move objects (like VR controller)
            const shouldActivate = leftGesture === "GRAB" || leftGesture === "PINCH" || leftGesture === "POINT";
            
            if (shouldActivate) {
              if (!leftControllerActive.current) {
                // Activate controller
                leftControllerActive.current = true;
                leftControllerScreenPos.current = palmScreenPos;
                leftControllerBasePos.current = { ...currentPos };
                leftHandPrevOrientation.current = handOrientation;
              } else if (leftControllerScreenPos.current && leftControllerBasePos.current) {
                // Controller active - process movement and rotation
                
                // POSITION: Map hand movement to object movement
                const deltaX = palmScreenPos.x - leftControllerScreenPos.current.x;
                const deltaY = palmScreenPos.y - leftControllerScreenPos.current.y;
                
                // Map screen movement to 3D space (account for mirrored video)
                const movementX = -deltaX * 12; // Invert X for mirrored video
                const movementY = -deltaY * 10; // Invert Y
                
                const newPos = {
                  x: leftControllerBasePos.current.x + movementX,
                  y: leftControllerBasePos.current.y + movementY,
                  z: leftControllerBasePos.current.z,
                };
                
                newPos.x = Math.max(-6, Math.min(6, newPos.x));
                newPos.y = Math.max(-5, Math.min(5, newPos.y));
                
                setGlobePosition(newPos);
                leftControllerScreenPos.current = palmScreenPos;
                
                // ROTATION: Based on hand orientation change
                if (leftHandPrevOrientation.current !== null) {
                  let orientationDelta = handOrientation - leftHandPrevOrientation.current;
                  
                  // Handle angle wrap-around (0 to 2π)
                  if (orientationDelta > Math.PI) orientationDelta -= 2 * Math.PI;
                  if (orientationDelta < -Math.PI) orientationDelta += 2 * Math.PI;
                  
                  // Only rotate if hand moved significantly (not just jitter)
                  if (Math.abs(orientationDelta) > 0.02) {
                    rotationBuffer.current.push({ 
                      x: orientationDelta * 3, // Scale for sensitivity
                      y: 0 
                    });
                    
                    if (rotationBuffer.current.length > 5) {
                      rotationBuffer.current.shift();
                    }
                    
                    const avgRotation = rotationBuffer.current.reduce(
                      (acc, val) => ({ x: acc.x + val.x, y: acc.y + val.y }),
                      { x: 0, y: 0 }
                    );
                    
                    const smoothRotation = {
                      x: avgRotation.x / rotationBuffer.current.length,
                      y: avgRotation.y / rotationBuffer.current.length,
                    };
                    
                    const currentRot = useStore.getState().globeRotation;
                    setGlobeRotation({
                      x: currentRot.x + smoothRotation.x,
                      y: currentRot.y + smoothRotation.y,
                    });
                  }
                }
                
                leftHandPrevOrientation.current = handOrientation;
              }
            } else {
              // Deactivate controller
              if (leftControllerActive.current) {
                leftControllerActive.current = false;
                leftControllerBasePos.current = null;
                leftControllerScreenPos.current = null;
                leftHandPrevOrientation.current = null;
                rotationBuffer.current = [];
              }
            }
            
            // Always update previous position for continuous tracking
            leftHandPrevPos.current = palmScreenPos;
          } else {
            // Hand lost - reset
            if (leftControllerActive.current) {
              leftControllerActive.current = false;
              leftControllerBasePos.current = null;
              leftControllerScreenPos.current = null;
              leftHandPrevOrientation.current = null;
            }
            leftHandPrevPos.current = null;
          }

          // RIGHT HAND - Continuous tracking
          if (right) {
            const palmScreenPos = { x: right[9].x, y: right[9].y };
            const handOrientation = getHandOrientation(right);
            
            // Activate controller on GRAB, PINCH, or POINT gesture
            // POINT = pointing gesture to move objects (like VR controller)
            const shouldActivate = rightGesture === "GRAB" || rightGesture === "PINCH" || rightGesture === "POINT";
            
            if (shouldActivate) {
              if (!rightControllerActive.current) {
                // Activate controller
                rightControllerActive.current = true;
                rightControllerScreenPos.current = palmScreenPos;
                rightControllerBasePos.current = { ...currentPos };
                rightHandPrevOrientation.current = handOrientation;
              } else if (rightControllerScreenPos.current && rightControllerBasePos.current) {
                // Controller active - process movement and rotation
                
                // POSITION: Map hand movement to object movement
                const deltaX = palmScreenPos.x - rightControllerScreenPos.current.x;
                const deltaY = palmScreenPos.y - rightControllerScreenPos.current.y;
                
                const movementX = -deltaX * 12; // Invert X for mirrored video
                const movementY = -deltaY * 10; // Invert Y
                
                const newPos = {
                  x: rightControllerBasePos.current.x + movementX,
                  y: rightControllerBasePos.current.y + movementY,
                  z: rightControllerBasePos.current.z,
                };
                
                newPos.x = Math.max(-6, Math.min(6, newPos.x));
                newPos.y = Math.max(-5, Math.min(5, newPos.y));
                
                setGlobePosition(newPos);
                rightControllerScreenPos.current = palmScreenPos;
                
                if (rightHandPrevOrientation.current !== null) {
                  let orientationDelta = handOrientation - rightHandPrevOrientation.current;
                  
                  // Handle angle wrap-around
                  if (orientationDelta > Math.PI) orientationDelta -= 2 * Math.PI;
                  if (orientationDelta < -Math.PI) orientationDelta += 2 * Math.PI;
                  
                  // Only rotate if hand moved significantly
                  if (Math.abs(orientationDelta) > 0.02) {
                    rotationBuffer.current.push({ 
                      x: orientationDelta * 3, // Scale for sensitivity
                      y: 0 
                    });
                    
                    if (rotationBuffer.current.length > 5) {
                      rotationBuffer.current.shift();
                    }
                    
                    const avgRotation = rotationBuffer.current.reduce(
                      (acc, val) => ({ x: acc.x + val.x, y: acc.y + val.y }),
                      { x: 0, y: 0 }
                    );
                    
                    const smoothRotation = {
                      x: avgRotation.x / rotationBuffer.current.length,
                      y: avgRotation.y / rotationBuffer.current.length,
                    };
                    
                    const currentRot = useStore.getState().globeRotation;
                    setGlobeRotation({
                      x: currentRot.x + smoothRotation.x,
                      y: currentRot.y + smoothRotation.y,
                    });
                  }
                }
                
                rightHandPrevOrientation.current = handOrientation;
              }
            } else {
              // Deactivate controller
              if (rightControllerActive.current) {
                rightControllerActive.current = false;
                rightControllerBasePos.current = null;
                rightControllerScreenPos.current = null;
                rightHandPrevOrientation.current = null;
                rotationBuffer.current = [];
              }
            }
            
            // Always update previous position for continuous tracking
            rightHandPrevPos.current = palmScreenPos;
          } else {
            // Hand lost - reset
            if (rightControllerActive.current) {
              rightControllerActive.current = false;
              rightControllerBasePos.current = null;
              rightControllerScreenPos.current = null;
              rightHandPrevOrientation.current = null;
            }
            rightHandPrevPos.current = null;
          }
        }

        // ============================================
        // PRIORITY 3: Swipe Detection (PALM_OPEN)
        // ============================================
        if (!isScaling.current && !leftControllerActive.current && !rightControllerActive.current) {
          const swipeHand = right || left;
          const swipeGesture = right ? rightGesture : leftGesture;

          if (swipeHand && swipeGesture === "PALM_OPEN") {
            const centroid = { x: swipeHand[9].x, y: swipeHand[9].y };

            if (prevHandPos.current) {
              const deltaX = centroid.x - prevHandPos.current.x;

              if (Math.abs(deltaX) > 0.18 && now - swipeCooldown.current > 1000) {
                if (deltaX > 0) {
                  prevScene();
                  playHoverSound();
                } else {
                  nextScene();
                  playHoverSound();
                }
                swipeCooldown.current = now;
              }
            }
            prevHandPos.current = centroid;
          } else {
            prevHandPos.current = null;
          }
        }
      }
    };

    initMediaPipe();

    return () => {
      try {
        if (camera) (camera as any).stop();
        if (hands) (hands as any).close();
        if (faceMesh) {
          try {
            (faceMesh as any).close();
          } catch (error) {
            // Ignore cleanup errors for face mesh
          }
        }
      } catch (error) {
        console.warn("Cleanup error:", error);
      }
    };
  }, [
    nextScene,
    prevScene,
    setFaceLandmarks,
    setGestures,
    setGlobeRotation,
    setGlobeScale,
    setGlobePosition,
    setHands,
    updateHandUI,
  ]);

  return (
    <div className="fixed inset-0 z-0">
      <video ref={videoRef} className="hidden" playsInline />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-cover -scale-x-100"
        width={1280}
        height={720}
      />
    </div>
  );
}
