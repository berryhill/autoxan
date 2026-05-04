package com.xandervoice

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

/**
 * AudioFocusPackage - React Native package registration for AudioFocusModule
 * 
 * This class registers the AudioFocusModule with React Native so it can be
 * accessed from JavaScript via NativeModules.AudioFocusManager
 * 
 * To use: Add AudioFocusPackage() to the getPackages() list in MainApplication.kt
 */
class AudioFocusPackage : ReactPackage {
    /**
     * Create and return the list of native modules this package provides
     */
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(AudioFocusModule(reactContext))
    }

    /**
     * Create and return the list of view managers this package provides
     * We don't have any custom views, so return empty list
     */
    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
