// src/context/BackgroundProvider.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { BACKGROUNDS } from "../backgrounds";

type BackgroundContextValue = {
  bgIndex: number;
  backgrounds: string[];
};

const BackgroundContext = createContext<BackgroundContextValue | null>(null);

export function BackgroundProvider({ children }: { children: ReactNode }) {
  const [bgIndex, setBgIndex] = useState(0);
  const backgrounds = BACKGROUNDS;

  useEffect(() => {
    // preload all images once
    backgrounds.forEach((src) => {
      const img = new Image();
      img.src = src;
    });

    const interval = setInterval(() => {
      setBgIndex((prev) => (prev + 1) % backgrounds.length);
    }, 12000); // 12s

    return () => clearInterval(interval);
  }, [backgrounds]);

  return (
    <BackgroundContext.Provider value={{ bgIndex, backgrounds }}>
      {children}
    </BackgroundContext.Provider>
  );
}

export function useBackground() {
  const ctx = useContext(BackgroundContext);
  if (!ctx) {
    throw new Error("useBackground must be used inside BackgroundProvider");
  }
  return ctx;
}
