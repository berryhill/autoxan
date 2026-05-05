/**
 * ControlsPanel - Container for all gesture control buttons
 *
 * This component renders all 5 gesture control buttons in a layout:
 * - Top row: Interrupt, Steer, Queue, Stop (4 buttons)
 * - Bottom row: Repeat (1 larger button, centered)
 *
 * Features:
 * - Automatic button state management based on session state
 * - Integration with useGestures hook for gesture handling
 * - Responsive layout with proper spacing
 *
 * Layout:
 * ┌─────────────────────────────────────────────────────────────┐
 * │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
 * │  │   🤚    │  │   🎯    │  │   📋    │  │   ⏹️    │        │
 * │  │Interrupt│  │  Steer  │  │  Queue  │  │  Stop   │        │
 * │  └─────────┘  └─────────┘  └─────────┘  └─────────┘        │
 * │                                                              │
 * │                      ┌─────────┐                            │
 * │                      │   🔄    │                            │
 * │                      │ Repeat  │                            │
 * │                      └─────────┘                            │
 * └─────────────────────────────────────────────────────────────┘
 *
 * Usage:
 * <ControlsPanel />
 *
 * Phase 10: Gesture Controls (Issue #11)
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { GestureButton } from './GestureButton';
import { useGestures } from '../hooks/useGestures';
import {
  GESTURE_CONFIGS,
  GestureAction,
  getTopRowGestures,
  getBottomRowGestures,
} from '../types/gestures';

/**
 * Props for ControlsPanel component
 */
export interface ControlsPanelProps {
  /** Optional test ID prefix for testing */
  testIDPrefix?: string;
}

/**
 * ControlsPanel component
 *
 * Renders all 5 gesture control buttons with proper layout and state management.
 * Automatically disables buttons based on the current session state.
 */
export function ControlsPanel({
  testIDPrefix = 'gesture-controls',
}: ControlsPanelProps): React.ReactElement {
  const { handleGesture, isGestureEnabled } = useGestures();

  /**
   * Handle button press - delegate to gesture handler
   */
  const handlePress = (action: GestureAction): void => {
    handleGesture(action);
  };

  // Get gesture actions for each row
  const topRowGestures = getTopRowGestures();
  const bottomRowGestures = getBottomRowGestures();

  return (
    <View style={styles.container} testID={testIDPrefix}>
      {/* Top row: Interrupt, Steer, Queue, Stop */}
      <View style={styles.row}>
        {topRowGestures.map((action) => (
          <GestureButton
            key={action}
            config={GESTURE_CONFIGS[action]}
            onPress={() => handlePress(action)}
            disabled={!isGestureEnabled(action)}
            size="medium"
            testID={`${testIDPrefix}-${action}`}
          />
        ))}
      </View>

      {/* Bottom row: Repeat (larger, centered) */}
      <View style={styles.row}>
        {bottomRowGestures.map((action) => (
          <GestureButton
            key={action}
            config={GESTURE_CONFIGS[action]}
            onPress={() => handlePress(action)}
            disabled={!isGestureEnabled(action)}
            size="large"
            testID={`${testIDPrefix}-${action}`}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
});

export default ControlsPanel;
