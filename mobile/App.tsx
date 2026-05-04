/**
 * Xander Voice App - Main Application Entry
 *
 * This is the main entry point for the Xander Voice App.
 * The app provides a voice interface for conversations with Xander,
 * your conversational AI companion.
 *
 * Phase 1: Project setup (current)
 * Phase 2: Voice hooks implementation
 * Phase 3: Xander API integration
 * Phase 4: State machine and voice flow
 * Phase 5: Audio focus management
 */

import React, { useState, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
} from 'react-native';

// Import from our project structure (placeholders for now)
import { VoiceButton } from './src/components/ui';
import type { VoiceButtonState } from './src/components/ui';

// App states
type AppState = 'idle' | 'listening' | 'processing' | 'speaking';

export default function App(): React.ReactElement {
  const [appState, setAppState] = useState<AppState>('idle');
  const [transcript, setTranscript] = useState<string>('');
  const [response, setResponse] = useState<string>('');
  const [sessionInfo, setSessionInfo] = useState({
    exchanges: 0,
    dispatched: 0,
  });

  // Map app state to voice button state
  const getVoiceButtonState = (): VoiceButtonState => {
    if (appState === 'listening') return 'listening';
    if (appState === 'processing' || appState === 'speaking') return 'processing';
    return 'idle';
  };

  // Handle voice button press
  const handleVoiceButtonPress = useCallback(() => {
    if (appState === 'idle') {
      // Start listening
      setAppState('listening');
      setTranscript('');
      console.log('[App] Started listening');

      // Simulate listening for 3 seconds, then process
      setTimeout(() => {
        setAppState('processing');
        setTranscript('Hello Xander, how are you today?');
        console.log('[App] Processing speech');

        // Simulate Xander thinking
        setTimeout(() => {
          setAppState('speaking');
          setResponse(
            "Hey there! I'm doing great, thanks for asking. What's on your mind today?"
          );
          setSessionInfo((prev) => ({
            ...prev,
            exchanges: prev.exchanges + 1,
          }));
          console.log('[App] Xander speaking');

          // After speaking, return to idle
          setTimeout(() => {
            setAppState('idle');
            console.log('[App] Ready for next exchange');
          }, 2000);
        }, 1500);
      }, 3000);
    } else if (appState === 'listening') {
      // Stop listening early
      setAppState('idle');
      console.log('[App] Stopped listening');
    }
  }, [appState]);

  // Handle goodbye
  const handleGoodbye = useCallback(() => {
    setResponse('Goodbye! Talk to you later.');
    setAppState('speaking');
    setTimeout(() => {
      // Reset session
      setAppState('idle');
      setTranscript('');
      setResponse('');
      setSessionInfo({ exchanges: 0, dispatched: 0 });
      console.log('[App] Session ended');
    }, 2000);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🎙️ Xander</Text>
        <Text style={styles.subtitle}>Your Voice Companion</Text>
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
          {transcript ? (
            <View style={styles.messageContainer}>
              <Text style={styles.messageLabel}>You said:</Text>
              <Text style={styles.messageText}>{transcript}</Text>
            </View>
          ) : null}

          {response ? (
            <View style={styles.messageContainer}>
              <Text style={styles.messageLabel}>Xander:</Text>
              <Text style={styles.messageText}>{response}</Text>
            </View>
          ) : null}

          {!transcript && !response ? (
            <View style={styles.placeholderContainer}>
              <Text style={styles.placeholderText}>
                Tap the microphone to start talking with Xander
              </Text>
              <Text style={styles.placeholderNote}>
                Phase 1: Project Setup Complete ✓
              </Text>
            </View>
          ) : null}
        </ScrollView>

        {/* Session Info */}
        <View style={styles.sessionInfo}>
          <Text style={styles.sessionText}>
            Session: {sessionInfo.exchanges} exchanges
          </Text>
          <Text style={styles.sessionText}>
            Dispatched: {sessionInfo.dispatched} tasks
          </Text>
        </View>
      </View>

      {/* Footer Actions */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.footerButton}
          onPress={() =>
            setSessionInfo((prev) => ({
              ...prev,
              dispatched: prev.dispatched + 1,
            }))
          }
        >
          <Text style={styles.footerButtonText}>📤 Dispatch to Silas</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.footerButton} onPress={handleGoodbye}>
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
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  contextContainer: {
    flex: 1,
    width: '100%',
    marginTop: 30,
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
  footerButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
