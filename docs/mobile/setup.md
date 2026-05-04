# Xander Voice App - Setup Guide

This guide walks you through setting up the Xander Voice App development environment.

## Prerequisites

### Required Software

1. **Node.js** (v18 or higher)
   ```bash
   # Check version
   node --version
   
   # Install via nvm (recommended)
   nvm install 18
   nvm use 18
   ```

2. **npm** (comes with Node.js) or **pnpm**
   ```bash
   # Check npm version
   npm --version
   
   # Or install pnpm
   npm install -g pnpm
   ```

3. **Expo CLI**
   ```bash
   npm install -g expo-cli
   ```

4. **Git**
   ```bash
   git --version
   ```

### For Android Development

1. **Android Studio**
   - Download from: https://developer.android.com/studio
   - Install Android SDK (API Level 34 recommended)
   - Set up an Android Virtual Device (AVD) emulator

2. **Environment Variables** (add to `~/.bashrc` or `~/.zshrc`)
   ```bash
   export ANDROID_HOME=$HOME/Android/Sdk
   export PATH=$PATH:$ANDROID_HOME/emulator
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   ```

3. **Or: Physical Android Device**
   - Enable Developer Options
   - Enable USB Debugging
   - Install [Expo Go](https://play.google.com/store/apps/details?id=host.exp.exponent) app

### For iOS Development (macOS only)

1. **Xcode** (from App Store)
2. **Xcode Command Line Tools**
   ```bash
   xcode-select --install
   ```
3. **CocoaPods**
   ```bash
   sudo gem install cocoapods
   ```

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/berryhill/autoxan.git
cd autoxan
```

### 2. Navigate to Mobile Directory

```bash
cd mobile
```

### 3. Install Dependencies

```bash
# Using npm
npm install

# Or using pnpm
pnpm install
```

### 4. Verify Installation

```bash
# Check that all dependencies are installed
ls node_modules | head -20
```

## Running the App

### Development Server

Start the Expo development server:

```bash
npm start
# or
npx expo start
```

This will display a QR code and options to run on different platforms.

### On Android Emulator

```bash
# Make sure Android emulator is running first
npm run android
# or
npx expo start --android
```

### On Physical Android Device

1. Install Expo Go from Google Play Store
2. Start the development server: `npm start`
3. Scan the QR code with Expo Go app
4. Or connect via USB and run: `npm run android`

### On iOS Simulator (macOS only)

```bash
npm run ios
# or
npx expo start --ios
```

## Configuration

### App Configuration (app.json)

The app is configured with the following key settings:

```json
{
  "expo": {
    "name": "Xander",
    "slug": "xander-voice",
    "version": "1.0.0",
    "android": {
      "package": "com.berryhill.xander",
      "permissions": [
        "RECORD_AUDIO",
        "MODIFY_AUDIO_SETTINGS"
      ]
    },
    "plugins": [
      ["expo-speech-recognition", {
        "microphonePermission": "...",
        "speechRecognitionPermission": "..."
      }]
    ]
  }
}
```

### TypeScript Configuration

Path aliases are configured for cleaner imports:

```typescript
// Instead of:
import { VoiceButton } from '../../../components/ui/VoiceButton';

// Use:
import { VoiceButton } from '@/components/ui';
```

## Project Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `start` | `npm start` | Start Expo development server |
| `android` | `npm run android` | Run on Android |
| `ios` | `npm run ios` | Run on iOS |
| `web` | `npm run web` | Run in web browser |
| `test` | `npm test` | Run unit tests |
| `test:watch` | `npm run test:watch` | Run tests in watch mode |
| `test:coverage` | `npm run test:coverage` | Run tests with coverage report |

## Testing

The mobile app includes a comprehensive testing setup using Jest and React Native Testing Library.

### Running Tests

```bash
# Run all tests once
npm test
# or
pnpm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### Test Configuration

Tests are configured in `package.json` with the following settings:

- **Test Environment**: `jsdom`
- **Transform**: Babel with TypeScript, React, and environment presets
- **Setup File**: `jest.setup.ts` (configures mocks and test environment)
- **Test Match**: Files in `__tests__/` directories or files with `.test.ts`/`.spec.ts` extensions

### Test Files

| File | Description |
|------|-------------|
| `src/hooks/__tests__/useVoice.test.ts` | Speech-to-Text hook tests |
| `src/hooks/__tests__/useSpeech.test.ts` | Text-to-Speech hook tests |

### Writing Tests

Tests use the React Native Testing Library pattern with mocked Expo modules:

```typescript
import { renderHook, act } from '@testing-library/react-native';
import { useVoice } from '../useVoice';

describe('useVoice', () => {
  it('should start with default state', () => {
    const { result } = renderHook(() => useVoice());
    
    expect(result.current.isListening).toBe(false);
    expect(result.current.transcript).toBe('');
  });
});
```

### Mocking Expo Modules

Expo modules are mocked in `jest.setup.ts`. When adding new Expo dependencies, add corresponding mocks:

```typescript
// jest.setup.ts
jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(),
  // ... other methods
}));
```

### Test Coverage

Run `npm run test:coverage` to generate a coverage report. Coverage is collected from:
- All `.ts` and `.tsx` files in `src/`
- Excludes `.d.ts` type definition files

## Troubleshooting

### Common Issues

#### "Unable to resolve module" errors

```bash
# Clear Metro bundler cache
npx expo start --clear

# Or reset node_modules
rm -rf node_modules
npm install
```

#### Android emulator not detected

```bash
# Verify ADB is working
adb devices

# Start emulator manually from Android Studio
# Then run expo
npm run android
```

#### Permission denied errors (Android)

The app requires microphone permissions. These are configured in `app.json`, but may need manual approval:

1. Go to Settings > Apps > Xander
2. Enable Microphone permission

#### Expo Go compatibility issues

Some features require a development build:

```bash
# Create development build
npx expo run:android

# Or use EAS Build
npx eas build --profile development --platform android
```

### Metro Bundler Issues

```bash
# Reset Metro cache
npx expo start --clear

# Kill all Metro processes
npx kill-port 8081

# Restart
npm start
```

### Dependency Issues

```bash
# Check for outdated packages
npm outdated

# Check for peer dependency issues
npm ls

# Reinstall all dependencies
rm -rf node_modules package-lock.json
npm install
```

## Development Workflow

### Making Changes

1. Start the development server: `npm start`
2. Edit files in `App.tsx` or `src/` directory
3. Changes auto-reload in the app (Fast Refresh)

### Running on Different Devices

```bash
# Android
npm run android

# iOS (macOS only)
npm run ios

# Web (limited functionality)
npm run web
```

### Debugging

1. **React DevTools**: Press `j` in terminal to open debugger
2. **Console Logs**: Appear in the terminal running Metro
3. **Network Requests**: Use React Native Debugger

## Building for Production

### Android APK

```bash
# Development build (requires Expo account)
npx expo build:android -t apk

# Using EAS Build (recommended)
npx eas build --platform android --profile production
```

### Android App Bundle (AAB)

```bash
npx eas build --platform android --profile production
```

## Native Module Integration

The app includes native Android modules that require additional setup after running Expo prebuild.

### Audio Focus Module (Android)

The `AudioFocusModule` enables the app to pause other audio apps (like Spotify or YouTube Music) when Xander speaks, and resume them when the conversation ends.

**Prerequisites:**
- Run Expo prebuild first: `npx expo prebuild --platform android`
- Ensure you have Android SDK installed

**Integration Steps:**

1. **Run Expo Prebuild** (if not already done):
   ```bash
   cd mobile
   npx expo prebuild --platform android
   ```

2. **Copy Native Module Files:**
   ```bash
   cp -r native-modules/android/com/xandervoice/* \
     android/app/src/main/java/com/xandervoice/
   ```

3. **Register the Package in MainApplication.kt:**
   
   Open `android/app/src/main/java/com/xandervoice/MainApplication.kt` and add:
   
   ```kotlin
   import com.xandervoice.AudioFocusPackage
   
   // In getPackages() method, add:
   override fun getPackages(): List<ReactPackage> =
     PackageList(this).packages.apply {
       add(AudioFocusPackage())
     }
   ```

4. **Rebuild the App:**
   ```bash
   npx expo run:android
   ```

**Verification:**

After integration, the `useAudioFocus` hook should work correctly:

```typescript
import { useAudioFocus } from '@/hooks';

const { requestFocus, abandonFocus, checkFocus } = useAudioFocus({
  onFocusGained: () => console.log('Audio focus gained'),
  onFocusLost: (permanent) => console.log('Audio focus lost', permanent),
});

// Request focus - this should pause other audio apps
const granted = await requestFocus();
console.log('Focus granted:', granted);
```

**Troubleshooting:**

If the native module is not found:
- Ensure the files were copied to the correct location
- Verify the package is registered in `MainApplication.kt`
- Clean and rebuild: `cd android && ./gradlew clean && cd .. && npx expo run:android`

For detailed API documentation, see:
- [Architecture Guide - Native Modules](./architecture.md#native-modules)
- [Native Module README](../../mobile/native-modules/android/README.md)

---

## Next Steps

After setup is complete:

1. Run the app and verify the basic voice interface works
2. Review the [Architecture Guide](./architecture.md) to understand the codebase
3. Check the [Project Plan](../../plans/xander-voice-app-plan.md) for upcoming phases

## Environment Variables

Currently, no environment variables are required for Phase 1. Future phases may require:

- `XANDER_API_URL` - URL for Xander agent (default: `http://localhost:3000`)
- `SILAS_API_URL` - URL for Silas workstation dispatch

---

*Last updated: Phase 5 - Audio Focus Management - Native Module Integration*
