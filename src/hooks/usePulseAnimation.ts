/**
 * Custom Hook: usePulseAnimation
 * 
 * Creates a reusable pulse animation for UI elements.
 * This hook encapsulates the animation logic, making it easy to add
 * pulsing effects to components like the AnchorBeam or listening indicators.
 * 
 * @param isActive - Whether the animation should be active
 * @param config - Animation configuration options
 * @returns Animated values for scale and opacity
 */

import { useEffect, useMemo } from "react";
import { Animated, Easing } from "react-native";
import { ANIMATION } from "../constants/ui";

interface PulseAnimationConfig {
  /** Duration of the animation cycle in milliseconds */
  duration?: number;
  /** Minimum scale value */
  minScale?: number;
  /** Maximum scale value */
  maxScale?: number;
  /** Minimum opacity value */
  minOpacity?: number;
  /** Maximum opacity value */
  maxOpacity?: number;
}

/**
 * Hook that creates a pulsing animation effect
 * @param isActive - Controls whether animation is running
 * @param config - Optional configuration for animation parameters
 * @returns Object with animated scale and opacity values
 */
export function usePulseAnimation(
  isActive: boolean,
  config: PulseAnimationConfig = {}
): { scale: Animated.Value; opacity: Animated.Value } {
  const {
    duration = ANIMATION.LISTENING_ANIMATION_DURATION,
    minScale = 1.0,
    maxScale = 1.08,
    minOpacity = 0.75,
    maxOpacity = 1.0,
  } = config;

  // Create animated values that persist across renders
  const scale = useMemo(() => new Animated.Value(minScale), []);
  const opacity = useMemo(() => new Animated.Value(minOpacity), []);

  useEffect(() => {
    if (!isActive) {
      // Reset to initial values when inactive
      scale.setValue(minScale);
      opacity.setValue(minOpacity);
      return;
    }

    // Create the pulsing animation loop
    const animation = Animated.loop(
      Animated.sequence([
        // Expand phase
        Animated.parallel([
          Animated.timing(scale, {
            toValue: maxScale,
            duration,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: maxOpacity,
            duration,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        // Contract phase
        Animated.parallel([
          Animated.timing(scale, {
            toValue: minScale,
            duration,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: minOpacity,
            duration,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    animation.start();

    // Cleanup: stop animation when component unmounts or isActive changes
    return () => {
      animation.stop();
    };
  }, [isActive, duration, minScale, maxScale, minOpacity, maxOpacity, scale, opacity]);

  return { scale, opacity };
}

