# Android Native Modules

This directory contains native Android modules for the Xander Voice App.

## AudioFocusModule

The `AudioFocusModule` handles Android audio focus management to:
- Pause music/podcasts when Xander starts speaking
- Resume music when the conversation ends
- Handle audio focus changes from other apps

### Files

- `com/xandervoice/AudioFocusModule.kt` - The native module implementation
- `com/xandervoice/AudioFocusPackage.kt` - Package registration

### Integration with Expo

This project uses Expo. To integrate these native modules:

1. **Run Expo Prebuild** (if not already done):
   ```bash
   cd mobile
   npx expo prebuild --platform android
   ```

2. **Copy the native module files** to the generated android directory:
   ```bash
   cp -r native-modules/android/com/xandervoice/* \
     android/app/src/main/java/com/xandervoice/
   ```

3. **Register the package** in `MainApplication.kt`:
   ```kotlin
   // In getPackages() method, add:
   packages.add(AudioFocusPackage())
   ```

   Or if using the auto-generated MainApplication:
   ```kotlin
   override fun getPackages(): List<ReactPackage> =
     PackageList(this).packages.apply {
       add(AudioFocusPackage())
     }
   ```

### Using from JavaScript

```typescript
import { NativeModules, NativeEventEmitter } from 'react-native';

const { AudioFocusManager } = NativeModules;
const eventEmitter = new NativeEventEmitter(AudioFocusManager);

// Request audio focus (pauses other audio)
const granted = await AudioFocusManager.requestFocus();

// Check if we have focus
const hasFocus = await AudioFocusManager.hasFocus();

// Abandon focus (lets other audio resume)
await AudioFocusManager.abandonFocus();

// Listen for focus changes
eventEmitter.addListener('audioFocusGained', () => {
  console.log('Audio focus gained');
});

eventEmitter.addListener('audioFocusLost', (event) => {
  console.log('Audio focus lost, permanent:', event.permanent);
});

eventEmitter.addListener('audioFocusDuck', () => {
  console.log('Should duck audio');
});
```

### API Reference

#### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `requestFocus()` | `Promise<boolean>` | Request transient audio focus. Returns true if granted. |
| `abandonFocus()` | `Promise<boolean>` | Release audio focus. Returns true on success. |
| `hasFocus()` | `Promise<boolean>` | Check if we currently have audio focus. |

#### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `audioFocusGained` | `null` | Fired when we gain audio focus |
| `audioFocusLost` | `{ permanent: boolean }` | Fired when we lose audio focus |
| `audioFocusDuck` | `null` | Fired when we should lower volume briefly |

### Requirements

- Android 8.0+ (API level 26+) for modern AudioFocusRequest API
- Falls back to deprecated API for older Android versions
