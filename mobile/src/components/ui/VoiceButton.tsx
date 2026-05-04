/**
 * VoiceButton - Main voice interaction button component
 *
 * This component displays the microphone button that users tap
 * to start/stop voice recognition. It provides visual feedback
 * for the current state (idle, listening, processing).
 *
 * Will be styled and animated in Phase 4.
 */

import React from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';

export type VoiceButtonState = 'idle' | 'listening' | 'processing';

interface VoiceButtonProps {
  state: VoiceButtonState;
  onPress: () => void;
  disabled?: boolean;
}

/**
 * Get emoji icon based on button state
 */
function getStateIcon(state: VoiceButtonState): string {
  switch (state) {
    case 'listening':
      return '🎤';
    case 'processing':
      return '💭';
    case 'idle':
    default:
      return '🎙️';
  }
}

/**
 * Get label text based on button state
 */
function getStateLabel(state: VoiceButtonState): string {
  switch (state) {
    case 'listening':
      return 'Listening...';
    case 'processing':
      return 'Processing...';
    case 'idle':
    default:
      return 'Tap to speak';
  }
}

export function VoiceButton({
  state,
  onPress,
  disabled = false,
}: VoiceButtonProps): React.ReactElement {
  const isActive = state === 'listening' || state === 'processing';

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.button,
          isActive && styles.buttonActive,
          disabled && styles.buttonDisabled,
        ]}
        onPress={onPress}
        disabled={disabled || state === 'processing'}
        activeOpacity={0.7}
      >
        {state === 'processing' ? (
          <ActivityIndicator size="large" color="#ffffff" />
        ) : (
          <Text style={styles.icon}>{getStateIcon(state)}</Text>
        )}
      </TouchableOpacity>
      <Text style={[styles.label, isActive && styles.labelActive]}>
        {getStateLabel(state)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#4a90d9',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonActive: {
    backgroundColor: '#e74c3c',
    transform: [{ scale: 1.1 }],
  },
  buttonDisabled: {
    backgroundColor: '#bdc3c7',
    opacity: 0.6,
  },
  icon: {
    fontSize: 40,
  },
  label: {
    marginTop: 12,
    fontSize: 16,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  labelActive: {
    color: '#e74c3c',
    fontWeight: '600',
  },
});

export default VoiceButton;
