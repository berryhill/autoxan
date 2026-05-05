/**
 * gestures.ts - Type definitions for gesture controls
 *
 * This file contains all type definitions for the 5-button gesture
 * control system that allows users to manage the conversation without
 * speaking.
 *
 * Gesture Controls:
 * - Interrupt (🤚): Stop Xander mid-speech, return to listening
 * - Steer (🎯): "Let me clarify..." - guide the conversation
 * - Queue (📋): "Remember this for later" - queue for dispatch to silas-workstation
 * - Stop (⏹️): End session, resume music, close app
 * - Repeat (🔄): "Say that again" - repeat last response
 *
 * Phase 10: Gesture Controls (Issue #11)
 */

/**
 * GestureAction - All possible gesture actions
 */
export type GestureAction =
  | 'interrupt' // Stop Xander, return to listening
  | 'steer' // Insert clarification
  | 'queue' // Queue current topic for dispatch
  | 'stop' // End session
  | 'repeat'; // Repeat last response

/**
 * GestureConfig - Configuration for a gesture button
 */
export interface GestureConfig {
  /** The action this gesture performs */
  action: GestureAction;
  /** Emoji icon for the button */
  icon: string;
  /** Short label for the button */
  label: string;
  /** Longer description for accessibility */
  description: string;
  /** Button background color */
  color: string;
}

/**
 * GestureButtonSize - Available sizes for gesture buttons
 */
export type GestureButtonSize = 'small' | 'medium' | 'large';

/**
 * GestureButtonSizeConfig - Size configuration for gesture buttons
 */
export interface GestureButtonSizeConfig {
  width: number;
  height: number;
  fontSize: number;
}

/**
 * Size presets for gesture buttons
 */
export const GESTURE_BUTTON_SIZES: Record<GestureButtonSize, GestureButtonSizeConfig> = {
  small: { width: 60, height: 60, fontSize: 24 },
  medium: { width: 80, height: 80, fontSize: 32 },
  large: { width: 100, height: 100, fontSize: 40 },
};

/**
 * GESTURE_CONFIGS - Configuration for all gesture controls
 *
 * Colors are designed to be visually distinct and provide
 * intuitive feedback:
 * - Interrupt: Red (stop action)
 * - Steer: Teal (guidance/direction)
 * - Queue: Blue (task/action)
 * - Stop: Green (calm, session end)
 * - Repeat: Purple (playback/refresh)
 */
export const GESTURE_CONFIGS: Record<GestureAction, GestureConfig> = {
  interrupt: {
    action: 'interrupt',
    icon: '🤚',
    label: 'Interrupt',
    description: 'Stop and let me speak',
    color: '#FF6B6B',
  },
  steer: {
    action: 'steer',
    icon: '🎯',
    label: 'Steer',
    description: 'Let me clarify something',
    color: '#4ECDC4',
  },
  queue: {
    action: 'queue',
    icon: '📋',
    label: 'Queue',
    description: 'Save this for silas-workstation',
    color: '#45B7D1',
  },
  stop: {
    action: 'stop',
    icon: '⏹️',
    label: 'Stop',
    description: 'End conversation',
    color: '#96CEB4',
  },
  repeat: {
    action: 'repeat',
    icon: '🔄',
    label: 'Repeat',
    description: 'Say that again',
    color: '#DDA0DD',
  },
};

/**
 * Get gesture config by action
 */
export function getGestureConfig(action: GestureAction): GestureConfig {
  return GESTURE_CONFIGS[action];
}

/**
 * Get all gesture actions in display order
 */
export function getGestureActions(): GestureAction[] {
  return ['interrupt', 'steer', 'queue', 'stop', 'repeat'];
}

/**
 * Get top row gesture actions (4 buttons)
 */
export function getTopRowGestures(): GestureAction[] {
  return ['interrupt', 'steer', 'queue', 'stop'];
}

/**
 * Get bottom row gesture actions (repeat only)
 */
export function getBottomRowGestures(): GestureAction[] {
  return ['repeat'];
}
