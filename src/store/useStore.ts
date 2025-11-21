import { create } from "zustand";

export interface Point {
  x: number;
  y: number;
  z: number;
}

export type GestureType =
  | "IDLE"
  | "PINCH"
  | "GRAB"
  | "PALM_OPEN"
  | "POINT"
  | "VICTORY";

export type HandLandmark = Point;
export type FaceLandmark = Point;

interface HUDState {
  systemStatus: "NOMINAL" | "WARNING" | "CRITICAL";
  powerLevel: number;
  threatLevel: "MINIMAL" | "LOW" | "MEDIUM" | "HIGH";
  message: string;
}

interface HandUI {
  visible: boolean;
  x: number;
  y: number;
  gesture: GestureType;
}

interface StoreState {
  // Tracking Data
  faceLandmarks: FaceLandmark[] | null;
  leftHand: HandLandmark[] | null;
  rightHand: HandLandmark[] | null;

  // Recognized Gestures
  leftGesture: GestureType;
  rightGesture: GestureType;

  // Globe State
  globeRotation: { x: number; y: number };
  globeScale: number;
  globePosition: { x: number; y: number; z: number };
  activeScene: number; // 0=Arc Reactor, 1=Earth, 2=Solar System, 3=Building Scene
  
  // Building Scene State
  importedModels: Array<{
    id: string;
    name: string;
    url: string; // URL to PLY/GLB file
    position: [number, number, number];
    rotation: [number, number, number];
    scale: number;
  }>;

  // HUD State
  hudState: HUDState;

  // Hand UI Data (for repulsor effect)
  handUiData: {
    left: HandUI;
    right: HandUI;
  };

  // Audio Settings
  soundEnabled: boolean;

  // Actions
  setFaceLandmarks: (landmarks: FaceLandmark[] | null) => void;
  setHands: (left: HandLandmark[] | null, right: HandLandmark[] | null) => void;
  setGestures: (left: GestureType, right: GestureType) => void;
  setGlobeRotation: (rotation: { x: number; y: number }) => void;
  setGlobeScale: (scale: number) => void;
  setGlobePosition: (position: { x: number; y: number; z: number }) => void;
  nextScene: () => void;
  prevScene: () => void;
  updateHUD: (updates: Partial<HUDState>) => void;
  updateHandUI: (hand: "left" | "right", data: Partial<HandUI>) => void;
  setSoundEnabled: (enabled: boolean) => void;
  
  // Building Scene Actions
  addImportedModel: (model: Omit<StoreState["importedModels"][0], "id">) => void;
  removeImportedModel: (id: string) => void;
  updateImportedModel: (id: string, updates: Partial<StoreState["importedModels"][0]>) => void;
}

export const useStore = create<StoreState>((set) => ({
  faceLandmarks: null,
  leftHand: null,
  rightHand: null,

  leftGesture: "IDLE",
  rightGesture: "IDLE",

  globeRotation: { x: 0, y: 0 },
  globeScale: 1.5,
  globePosition: { x: 0, y: 0, z: 0 },
  activeScene: 0,

  hudState: {
    systemStatus: "NOMINAL",
    powerLevel: 100,
    threatLevel: "MINIMAL",
    message: "INITIALIZING SYSTEMS...",
  },

  handUiData: {
    left: { visible: false, x: 0, y: 0, gesture: "IDLE" },
    right: { visible: false, x: 0, y: 0, gesture: "IDLE" },
  },

  soundEnabled: false,

  setFaceLandmarks: (landmarks) => set({ faceLandmarks: landmarks }),
  setHands: (left, right) => set({ leftHand: left, rightHand: right }),
  setGestures: (left, right) => set({ leftGesture: left, rightGesture: right }),
  setGlobeRotation: (rotation) => set({ globeRotation: rotation }),
  setGlobeScale: (scale) => set({ globeScale: scale }),
  setGlobePosition: (position) => set({ globePosition: position }),
  nextScene: () =>
    set((state) => ({ activeScene: (state.activeScene + 1) % 4 })),
  prevScene: () =>
    set((state) => ({ activeScene: (state.activeScene - 1 + 4) % 4 })),
  updateHUD: (updates) =>
    set((state) => ({ hudState: { ...state.hudState, ...updates } })),
  updateHandUI: (hand, data) =>
    set((state) => ({
      handUiData: {
        ...state.handUiData,
        [hand]: { ...state.handUiData[hand], ...data },
      },
    })),
  setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
  
  // Building Scene State
  importedModels: [],
  
  // Building Scene Actions
  addImportedModel: (model) => {
    const id = `model-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    set((state) => ({
      importedModels: [...state.importedModels, { ...model, id }],
    }));
  },
  removeImportedModel: (id) =>
    set((state) => ({
      importedModels: state.importedModels.filter((m) => m.id !== id),
    })),
  updateImportedModel: (id, updates) =>
    set((state) => ({
      importedModels: state.importedModels.map((m) =>
        m.id === id ? { ...m, ...updates } : m
      ),
    })),
}));
