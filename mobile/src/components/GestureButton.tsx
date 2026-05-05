/**
 * GestureButton - Individual gesture control button component
 *
 * This component renders a single gesture button with:
 * - Visual feedback (animated scale on press)
 * - Accessibility support (labels and hints)
 * - Configurable size (small, medium, large)
 * - Disabled state styling
 *
 * Usage:
 * <GestureButton
 *   config={GESTURE_CONFIGS.interrupt}
 *   onPress={() => handleGesture('interrupt')}
 *   disabled={!isGestureEnabled('interrupt')}
 * />
 *
 * Phase 10: Gesture Controls (Issue #11)
 */

import React, { useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  ViewStyle,
  TextStyle,
} from 'react-native';
import {
  GestureConfig,
  GestureButtonSize,
  GESTURE_BUTTON_SIZES,
} from '../types/gestures';

/**
 * Props for GestureButton component
 */
export interface GestureButtonProps {
  /** Configuration for the gesture (icon, label, color, etc.) */
  config: GestureConfig;
  /** Callback when button is pressed */
  onPress: () => void;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Size of the button */
  size?: GestureButtonSize;
  /** Optional test ID for testing */
  testID?: string;
}

/**
 * Disabled button background color
 */
const DISABLED_COLOR = '#cccccc';

/**
 * GestureButton component
 *
 * An animated button for gesture controls with visual and haptic feedback.
 * Uses Animated.spring for smooth scale animations on press.
 */
export function GestureButton({
  config,
  onPress,
  disabled = false,
  size = 'medium',
  testID,
}: GestureButtonProps): React.ReactElement {
  // Animation value for scale effect
  const scale = useRef(new Animated.Value(1)).current;

  // Get size configuration
  const sizeConfig = GESTURE_BUTTON_SIZES[size];

  /**
   * Handle press in - animate to smaller scale
   */
  const handlePressIn = (): void => {
    Animated.spring(scale, {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();
  };

  /**
   * Handle press out - animate back to normal scale
   */
  const handlePressOut = (): void => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  // Dynamic button style based on size and disabled state
  const buttonStyle: ViewStyle = {
    width: sizeConfig.width,
    height: sizeConfig.height,
    backgroundColor: disabled ? DISABLED_COLOR : config.color,
  };

  // Dynamic icon style based on size
  const iconStyle: TextStyle = {
    fontSize: sizeConfig.fontSize,
  };

  return (
    <Animated.View style={[styles.animatedContainer, { transform: [{ scale }] }]}>
      <TouchableOpacity
        style={[styles.button, buttonStyle]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        activeOpacity={0.8}
        accessibilityLabel={config.label}
        accessibilityHint={config.description}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        testID={testID}
      >
        <Text style={[styles.icon, iconStyle]}>{config.icon}</Text>
        <Text style={styles.label}>{config.label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  animatedContainer: {
    // Container for the animated view
  },
  button: {
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    margin: 8,
  },
  icon: {
    marginBottom: 4,
  },
  label: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default GestureButton;
