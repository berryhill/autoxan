/**
 * Xander Voice App - Main Application Entry
 *
 * This is the main entry point for the Xander Voice App.
 * The app provides a voice interface for conversations with Xander,
 * your conversational AI companion.
 *
 * Phase 4: State Machine and Voice Flow
 * - Implements conversation loop: listen -> process -> speak -> listen
 * - 30-second inactivity timeout
 * - Goodbye keyword detection
 * - Error handling and recovery
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';

// Import components
import { VoiceButton } from './src/components/ui';
import type { VoiceButtonState } from './src/components/ui';

// Import hooks
import { useVoice } from './src/hooks';
import { useSpeech } from './src/hooks';

// Import store
import {
  useSessionStore,
  containsGoodbye,
  SESSION_TIMEOUT,
  ConversationState,
} from './src/store';

// Import API
import { xanderApi } from './src/api';

/**
 * Main App Component
 *
 * Orchestrates the voice conversation flow using:
 * - useSessionStore for state management
 * - useVoice for speech-to-text
 * - useSpeech for text-to-speech
 * - xanderApi for Xander communication
 */
export default function App(): React.ReactElement {
  // Store state
  const {
    sessionState,
    sessionId,
    messages,
    currentTranscript,
    lastXanderResponse,
    dispatchedWork,
    error,
    startSession,
    endSession,
    transitionTo,
    addMessage,
    setCurrentTranscript,
    setError,
    updateActivity,
    getTimeSinceLastActivity,
    reset,
    addDispatchedWork,
  } = useSessionStore();

  // Voice recognition hook
  const {
    isListening,
    transcript,
    partialTranscript,
    error: voiceError,
    startListening,
    stopListening,
    resetTranscript,
  } = useVoice();

  // Text-to-speech hook
  const {
    isSpeaking,
    speak,
    stop: stopSpeaking,
  } = useSpeech();

  // Timer ref for inactivity timeout
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Flag to prevent multiple goodbye triggers
  const goodbyeTriggeredRef = useRef(false);

  /**
   * Clear inactivity timer
   */
  const clearInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearInterval(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
  }, []);

  /**
   * Handle inactivity timeout
   * Called when user has been inactive for 30 seconds
   */
  const handleInactivityTimeout = useCallback(async () => {
    console.log('[App] Inactivity timeout triggered');

    // Stop any ongoing operations
    await stopListening();
    await stopSpeaking();

    // Say goodbye
    await speak("I haven't heard from you in a while. Goodbye for now!");

    // End session after speaking
    setTimeout(() => {
      endSession();
      goodbyeTriggeredRef.current = false;
    }, 2500);
  }, [stopListening, stopSpeaking, speak, endSession]);

  /**
   * Start inactivity timer
   * Checks every 5 seconds if user has been inactive
   */
  const startInactivityTimer = useCallback(() => {
    clearInactivityTimer();

    inactivityTimerRef.current = setInterval(() => {
      const timeSinceActivity = getTimeSinceLastActivity();

      if (timeSinceActivity >= SESSION_TIMEOUT.INACTIVITY_MS) {
        clearInactivityTimer();
        handleInactivityTimeout();
      }
    }, 5000); // Check every 5 seconds
  }, [clearInactivityTimer, getTimeSinceLastActivity, handleInactivityTimeout]);

  /**
   * Handle goodbye - end the session gracefully
   */
  const handleGoodbye = useCallback(async () => {
    if (goodbyeTriggeredRef.current) return;
    goodbyeTriggeredRef.current = true;

    console.log('[App] Goodbye triggered');

    // Stop any ongoing operations
    await stopListening();

    // Transition to speaking
    transitionTo('speaking');

    // Say goodbye
    await speak('Goodbye! Talk to you later.', {
      onDone: () => {
        endSession();
        goodbyeTriggeredRef.current = false;
      },
      onStopped: () => {
        endSession();
        goodbyeTriggeredRef.current = false;
      },
    });
  }, [stopListening, transitionTo, speak, endSession]);

  /**
   * Process user transcript and get Xander response
   */
  const processTranscript = useCallback(async (userText: string) => {
    if (!userText.trim()) {
      // Empty transcript, go back to listening
      transitionTo('listening');
      return;
    }

    console.log('[App] Processing transcript:', userText);

    // Check for goodbye keywords
    if (containsGoodbye(userText)) {
      addMessage('user', userText);
      await handleGoodbye();
      return;
    }

    // Add user message
    addMessage('user', userText);

    // Transition to processing
    transitionTo('processing');

    try {
      // Send to Xander
      const response = await xanderApi.sendMessage(userText);

      console.log('[App] Xander response:', response.message);

      // Add Xander's response
      addMessage('assistant', response.message);

      // Transition to speaking
      transitionTo('speaking');

      // Speak Xander's response
      await speak(response.message, {
        onDone: () => {
          // After speaking, go back to listening
          if (sessionState !== 'ended' && sessionState !== 'error') {
            transitionTo('listening');
          }
        },
        onStopped: () => {
          // If stopped early, still go back to listening
          if (sessionState !== 'ended' && sessionState !== 'error') {
            transitionTo('listening');
          }
        },
        onError: (err) => {
          console.error('[App] Speech error:', err);
          setError(`Speech error: ${err.message}`);
        },
      });

      // Check if Xander suggests dispatch
      if (response.metadata?.suggestDispatch && response.metadata?.dispatchSummary) {
        // Could show UI prompt here, for now auto-dispatch
        addDispatchedWork(response.metadata.dispatchSummary);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get response from Xander';
      console.error('[App] Xander API error:', errorMessage);
      setError(errorMessage);
    }
  }, [
    transitionTo,
    addMessage,
    handleGoodbye,
    speak,
    setError,
    sessionState,
    addDispatchedWork,
  ]);

  /**
   * Start listening for voice input
   */
  const startVoiceListening = useCallback(async () => {
    resetTranscript();
    setCurrentTranscript('');
    updateActivity();

    try {
      await startListening({
        lang: 'en-US',
        interimResults: true,
        continuous: false,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start voice recognition';
      console.error('[App] Voice start error:', errorMessage);
      setError(errorMessage);
    }
  }, [resetTranscript, setCurrentTranscript, updateActivity, startListening, setError]);

  /**
   * Handle voice button press
   */
  const handleVoiceButtonPress = useCallback(async () => {
    updateActivity();

    switch (sessionState) {
      case 'idle':
      case 'ended':
        // Start new session
        startSession();
        break;

      case 'listening':
        // Stop listening early
        await stopListening();
        break;

      case 'speaking':
        // Stop speaking, go back to listening
        await stopSpeaking();
        transitionTo('listening');
        break;

      case 'error':
        // Reset and try again
        reset();
        break;

      default:
        // For connecting and processing, just update activity
        break;
    }
  }, [
    sessionState,
    updateActivity,
    startSession,
    stopListening,
    stopSpeaking,
    transitionTo,
    reset,
  ]);

  /**
   * Handle dispatch button press
   */
  const handleDispatch = useCallback(() => {
    updateActivity();

    if (lastXanderResponse) {
      addDispatchedWork(`Dispatch from conversation: ${lastXanderResponse.substring(0, 50)}...`);
      Alert.alert('Dispatched', 'Task sent to Silas!');
    } else {
      Alert.alert('No Content', 'Nothing to dispatch yet.');
    }
  }, [updateActivity, lastXanderResponse, addDispatchedWork]);

  // Map session state to voice button state
  const getVoiceButtonState = (): VoiceButtonState => {
    switch (sessionState) {
      case 'listening':
        return 'listening';
      case 'connecting':
      case 'processing':
      case 'speaking':
        return 'processing';
      default:
        return 'idle';
    }
  };

  // Get status text based on session state
  const getStatusText = (): string => {
    switch (sessionState) {
      case 'idle':
        return 'Tap to start';
      case 'connecting':
        return 'Connecting to Xander...';
      case 'listening':
        return 'Listening...';
      case 'processing':
        return 'Processing...';
      case 'speaking':
        return 'Xander is speaking...';
      case 'error':
        return 'Error occurred';
      case 'ended':
        return 'Session ended';
      default:
        return '';
    }
  };

  /**
   * Effect: Handle session state changes
   */
  useEffect(() => {
    const handleStateChange = async () => {
      switch (sessionState) {
        case 'connecting':
          // Connect to Xander
          console.log('[App] Connecting to Xander...');
          try {
            const isAvailable = await xanderApi.healthCheck();
            if (isAvailable) {
              await xanderApi.startSession();
            }
            // Transition to listening whether Xander is available or not
            // (we handle offline mode gracefully)
            transitionTo('listening');
            startInactivityTimer();
          } catch (err) {
            console.warn('[App] Connection warning:', err);
            // Still transition to listening - we can work in offline mode
            transitionTo('listening');
            startInactivityTimer();
          }
          break;

        case 'listening':
          // Start voice recognition
          if (!isListening) {
            startVoiceListening();
          }
          break;

        case 'ended':
          // Clean up
          clearInactivityTimer();
          await xanderApi.endSession();
          break;

        default:
          break;
      }
    };

    handleStateChange();
  }, [sessionState, transitionTo, startInactivityTimer, clearInactivityTimer, isListening, startVoiceListening]);

  /**
   * Effect: Handle voice recognition state
   */
  useEffect(() => {
    // Update current transcript with partial results
    if (partialTranscript) {
      setCurrentTranscript(partialTranscript);
      updateActivity();
    }
  }, [partialTranscript, setCurrentTranscript, updateActivity]);

  /**
   * Effect: Handle final transcript
   */
  useEffect(() => {
    // When we get a final transcript, process it
    if (transcript && sessionState === 'listening' && !isListening) {
      processTranscript(transcript);
      resetTranscript();
    }
  }, [transcript, sessionState, isListening, processTranscript, resetTranscript]);

  /**
   * Effect: Handle voice errors
   */
  useEffect(() => {
    if (voiceError) {
      console.error('[App] Voice error:', voiceError);
      setError(voiceError);
    }
  }, [voiceError, setError]);

  /**
   * Effect: Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      clearInactivityTimer();
    };
  }, [clearInactivityTimer]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🎙️ Xander</Text>
        <Text style={styles.subtitle}>Your Voice Companion</Text>
        <Text style={styles.statusText}>{getStatusText()}</Text>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Voice Button */}
        <VoiceButton
          state={getVoiceButtonState()}
          onPress={handleVoiceButtonPress}
        />

        {/* Context Display */}
        <ScrollView style={styles.contextContainer}>
          {/* Current Transcript (partial) */}
          {currentTranscript && sessionState === 'listening' ? (
            <View style={[styles.messageContainer, styles.partialMessage]}>
              <Text style={styles.messageLabel}>You're saying:</Text>
              <Text style={styles.messageText}>{currentTranscript}</Text>
            </View>
          ) : null}

          {/* Messages */}
          {messages.slice(-4).map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageContainer,
                message.role === 'user' ? styles.userMessage : styles.assistantMessage,
              ]}
            >
              <Text style={styles.messageLabel}>
                {message.role === 'user' ? 'You:' : 'Xander:'}
              </Text>
              <Text style={styles.messageText}>{message.content}</Text>
            </View>
          ))}

          {/* Error display */}
          {error ? (
            <View style={[styles.messageContainer, styles.errorMessage]}>
              <Text style={styles.messageLabel}>Error:</Text>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Placeholder */}
          {!currentTranscript && messages.length === 0 && !error ? (
            <View style={styles.placeholderContainer}>
              <Text style={styles.placeholderText}>
                Tap the microphone to start talking with Xander
              </Text>
              <Text style={styles.placeholderNote}>
                Phase 4: State Machine Complete ✓
              </Text>
            </View>
          ) : null}
        </ScrollView>

        {/* Session Info */}
        <View style={styles.sessionInfo}>
          <Text style={styles.sessionText}>
            Session: {messages.filter((m) => m.role === 'user').length} exchanges
          </Text>
          <Text style={styles.sessionText}>
            Dispatched: {dispatchedWork.length} tasks
          </Text>
        </View>
      </View>

      {/* Footer Actions */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.footerButton, !lastXanderResponse && styles.footerButtonDisabled]}
          onPress={handleDispatch}
          disabled={!lastXanderResponse}
        >
          <Text style={styles.footerButtonText}>📤 Dispatch to Silas</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.footerButton, styles.goodbyeButton]}
          onPress={handleGoodbye}
          disabled={sessionState === 'idle' || sessionState === 'ended'}
        >
          <Text style={styles.footerButtonText}>👋 Goodbye</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
  },
  header: {
    paddingTop: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    marginTop: 4,
  },
  statusText: {
    fontSize: 14,
    color: '#3498db',
    marginTop: 8,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  contextContainer: {
    flex: 1,
    width: '100%',
    marginTop: 20,
    paddingHorizontal: 10,
  },
  messageContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userMessage: {
    backgroundColor: '#e8f4fd',
    borderLeftWidth: 3,
    borderLeftColor: '#3498db',
  },
  assistantMessage: {
    backgroundColor: '#e8f8e8',
    borderLeftWidth: 3,
    borderLeftColor: '#27ae60',
  },
  partialMessage: {
    backgroundColor: '#fff9e6',
    borderLeftWidth: 3,
    borderLeftColor: '#f1c40f',
    opacity: 0.9,
  },
  errorMessage: {
    backgroundColor: '#fde8e8',
    borderLeftWidth: 3,
    borderLeftColor: '#e74c3c',
  },
  messageLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7f8c8d',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    color: '#2c3e50',
    lineHeight: 22,
  },
  errorText: {
    fontSize: 14,
    color: '#e74c3c',
    lineHeight: 20,
  },
  placeholderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  placeholderText: {
    fontSize: 16,
    color: '#95a5a6',
    textAlign: 'center',
  },
  placeholderNote: {
    fontSize: 14,
    color: '#27ae60',
    textAlign: 'center',
    marginTop: 20,
    fontWeight: '500',
  },
  sessionInfo: {
    backgroundColor: '#ecf0f1',
    borderRadius: 8,
    padding: 12,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  sessionText: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: 30,
    gap: 12,
  },
  footerButton: {
    flex: 1,
    backgroundColor: '#3498db',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  footerButtonDisabled: {
    backgroundColor: '#bdc3c7',
  },
  goodbyeButton: {
    backgroundColor: '#e74c3c',
  },
  footerButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
