import React, { createContext, useContext, useEffect, useMemo, useRef } from 'react';
import {
  useSharedValue,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Accelerometer } from 'expo-sensors';

const LiquidMotionContext = createContext(null);

const SPRING_CONFIG = { damping: 18, stiffness: 90, mass: 0.6 };
const SHAKE_THRESHOLD = 2.2;

export function LiquidMotionProvider({ children }) {
  const tiltX = useSharedValue(0);
  const tiltY = useSharedValue(0);
  const shakeIntensity = useSharedValue(0);
  const lastMagRef = useRef(1);

  useEffect(() => {
    Accelerometer.setUpdateInterval(16); // ~60fps

    const subscription = Accelerometer.addListener(({ x, y, z }) => {
      tiltX.value = withSpring(x, SPRING_CONFIG);
      tiltY.value = withSpring(y, SPRING_CONFIG);

      const mag = Math.hypot(x, y, z);
      const delta = Math.abs(mag - lastMagRef.current);
      lastMagRef.current = mag;

      if (delta > SHAKE_THRESHOLD) {
        shakeIntensity.value = withSequence(
          withTiming(1, { duration: 80 }),
          withSpring(0, { damping: 8, stiffness: 180 })
        );
      }
    });

    return () => subscription.remove();
  }, []);

  const contextValue = useMemo(
    () => ({ tiltX, tiltY, shakeIntensity }),
    [tiltX, tiltY, shakeIntensity]
  );

  return (
    <LiquidMotionContext.Provider value={contextValue}>
      {children}
    </LiquidMotionContext.Provider>
  );
}

export function useLiquidMotion() {
  return useContext(LiquidMotionContext);
}
