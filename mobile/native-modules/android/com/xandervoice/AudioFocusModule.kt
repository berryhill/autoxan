package com.xandervoice

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.os.Build
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * AudioFocusModule - Native Android module for managing audio focus
 * 
 * This module handles:
 * - Requesting transient audio focus when Xander starts speaking
 * - Abandoning audio focus when the session ends
 * - Handling focus changes from other apps
 * - Emitting events to JavaScript when focus changes
 * 
 * Audio Focus Flow:
 * 1. App opens -> requestFocus() -> Music pauses
 * 2. Conversation happens with Xander
 * 3. Session ends -> abandonFocus() -> Music resumes
 */
class AudioFocusModule(reactContext: ReactApplicationContext) : 
    ReactContextBaseJavaModule(reactContext) {

    private val audioManager: AudioManager = 
        reactContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    
    private var focusRequest: AudioFocusRequest? = null
    private var hasFocus = false

    /**
     * Returns the name of this module for use in JavaScript
     * Accessed via NativeModules.AudioFocusManager
     */
    override fun getName(): String = "AudioFocusManager"

    /**
     * Audio focus change listener
     * Handles different focus states and emits events to JavaScript
     */
    private val focusChangeListener = AudioManager.OnAudioFocusChangeListener { focusChange ->
        when (focusChange) {
            AudioManager.AUDIOFOCUS_GAIN -> {
                // We regained audio focus
                hasFocus = true
                sendEvent("audioFocusGained", null)
            }
            AudioManager.AUDIOFOCUS_LOSS -> {
                // Permanent loss - another app took focus
                hasFocus = false
                sendEvent("audioFocusLost", Arguments.createMap().apply {
                    putBoolean("permanent", true)
                })
            }
            AudioManager.AUDIOFOCUS_LOSS_TRANSIENT -> {
                // Temporary loss - e.g., phone call
                hasFocus = false
                sendEvent("audioFocusLost", Arguments.createMap().apply {
                    putBoolean("permanent", false)
                })
            }
            AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK -> {
                // Another app wants focus briefly, we should lower volume
                sendEvent("audioFocusDuck", null)
            }
        }
    }

    /**
     * Request transient audio focus
     * This pauses other audio apps (like Spotify, YouTube Music)
     * 
     * @param promise Resolves to true if focus was granted, false otherwise
     */
    @ReactMethod
    fun requestFocus(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                // Android 8.0+ (API 26+) - Use AudioFocusRequest builder
                focusRequest = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
                    .setAudioAttributes(
                        AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_ASSISTANT)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                            .build()
                    )
                    .setAcceptsDelayedFocusGain(true)
                    .setOnAudioFocusChangeListener(focusChangeListener)
                    .build()

                val result = audioManager.requestAudioFocus(focusRequest!!)
                hasFocus = result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
                promise.resolve(hasFocus)
            } else {
                // Pre-Android 8.0 - Use deprecated API
                @Suppress("DEPRECATION")
                val result = audioManager.requestAudioFocus(
                    focusChangeListener,
                    AudioManager.STREAM_MUSIC,
                    AudioManager.AUDIOFOCUS_GAIN_TRANSIENT
                )
                hasFocus = result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
                promise.resolve(hasFocus)
            }
        } catch (e: Exception) {
            promise.reject("AUDIO_FOCUS_ERROR", e.message)
        }
    }

    /**
     * Abandon audio focus
     * This allows other audio apps to resume playback
     * 
     * @param promise Resolves to true when focus is abandoned
     */
    @ReactMethod
    fun abandonFocus(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && focusRequest != null) {
                audioManager.abandonAudioFocusRequest(focusRequest!!)
            } else {
                @Suppress("DEPRECATION")
                audioManager.abandonAudioFocus(focusChangeListener)
            }
            hasFocus = false
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("AUDIO_FOCUS_ERROR", e.message)
        }
    }

    /**
     * Check if we currently have audio focus
     * 
     * @param promise Resolves to current focus state
     */
    @ReactMethod
    fun hasFocus(promise: Promise) {
        promise.resolve(hasFocus)
    }

    /**
     * Send event to JavaScript
     * Used to notify JS of focus changes
     */
    private fun sendEvent(eventName: String, params: WritableMap?) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    /**
     * Required for NativeEventEmitter
     * Called when JavaScript adds a listener
     */
    @ReactMethod
    fun addListener(eventName: String) {
        // Required for RN event emitter - no implementation needed
    }

    /**
     * Required for NativeEventEmitter
     * Called when JavaScript removes listeners
     */
    @ReactMethod
    fun removeListeners(count: Int) {
        // Required for RN event emitter - no implementation needed
    }
}
