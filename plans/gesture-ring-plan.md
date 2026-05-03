# Gesture Ring Control System - Project Plan

## Overview

A wearable gesture input system that converts finger motion into semantic commands for agent control. This is the **hardware evolution** of the placeholder gesture buttons in the Xander Voice App.

**Core Insight:** This is NOT a ring. It is a `gesture → intent → agent command system`. The ring is just the input device.

---

## Relationship to Xander Voice App

```
┌─────────────────────────────────────────────────────────────────┐
│  XANDER VOICE APP (React Native)                                │
│                                                                  │
│  Current: Placeholder Buttons                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  ✋ Interrupt  🔀 Steer  📋 Queue  ⏹️ Stop  🔁 Repeat   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              ↑                                   │
│                              │                                   │
│  Future: Gesture Ring Input  │                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  double tap → interrupt                                  │    │
│  │  flick up → queue                                       │    │
│  │  flick right → steer                                    │    │
│  │  shake → cancel/stop                                    │    │
│  │  hold → voice mode (repeat/speak)                       │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Evolution Path

| Phase | Input Method | Notes |
|-------|--------------|-------|
| **Now** | On-screen buttons | Validate UX, test command mapping |
| **Phase 1** | Phone IMU gestures | Shake phone to interrupt, etc. |
| **Phase 4+** | Wearable gesture ring | Finger/wrist sensor system |

---

## Command Vocabulary

| Gesture | Command | Effect on Xander |
|---------|---------|------------------|
| **double tap** | `interrupt` | Stop TTS, open mic for user |
| **flick up** | `queue` | Save current topic for later |
| **flick right** | `steer` | Signal "change direction" |
| **shake** | `cancel` | End current action/session |
| **hold/squeeze** | `voice_mode` | Activate voice input |

---

## System Architecture

### Data Flow

```
Finger Sensor → MCU (wrist) → BLE → Phone → Gesture Model → Command Mapper → Xander
```

### Components

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  FINGER          │     │  WRIST           │     │  PHONE           │
│  (sensors only)  │────▶│  (MCU + BLE)     │────▶│  (processing)    │
│                  │     │                  │     │                  │
│  • IMU sensor    │     │  • Seeed XIAO    │     │  • BLE receiver  │
│  • Optional FSR  │     │  • nRF52840      │     │  • Classifier    │
│                  │     │  • Battery       │     │  • Command mapper│
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

---

## Implementation Phases

### Phase 1: Software-First Prototype (No Hardware)

**Goal:** Validate gesture → command system using phone sensors

**Steps:**
1. Use Android phone IMU (accelerometer + gyroscope)
2. Detect basic gestures: double tap, shake, flick
3. Map gestures to Xander commands via script
4. Test with Xander Voice App

**Output:** Working gesture → Xander pipeline (phone only)

**Estimated Time:** 1-2 days

---

### Phase 2: Data Collection + Gesture Definition

**Gesture Vocabulary v1:**
- double tap → interrupt
- squeeze/hold → voice mode
- flick up → queue
- flick right → steer
- shake → cancel

**Data Collection Requirements:**
- Sampling rate: 100–200 Hz
- Window: ~2 seconds per gesture
- Samples per gesture: 50–100
- Include idle/noise data

**Output Format:**
```json
{
  "label": "interrupt",
  "timestamp": 1234567890,
  "samples": [
    {"ax": 0.1, "ay": -9.8, "az": 0.2, "gx": 0.01, "gy": 0.02, "gz": 0.01}
  ]
}
```

**Estimated Time:** 2-3 days

---

### Phase 3: ML Gesture Recognition

**Stage 1 - Heuristic Detection (fast):**
- Acceleration spikes → taps
- Repeated motion → shake
- Directional spikes → flick

**Stage 2 - Feature-Based Model:**
- Features: mean, std, max, peak acceleration, gyro energy
- Models: Random Forest, XGBoost

**Stage 3 - Deep Learning (optional):**
- 1D CNN or LSTM
- TensorFlow Lite for on-device

**Output:** Classifier: `sensor window → gesture label`

**Estimated Time:** 3-5 days

---

### Phase 4: Hardware Prototype (Finger + Wrist Split)

**Design Philosophy:** Finger has sensors only, wrist has compute/power

**Components:**

| Component | Options | Notes |
|-----------|---------|-------|
| MCU (wrist) | Seeed XIAO nRF52840 Sense, ESP32-S3 | BLE capable |
| IMU (finger) | BMI270, ICM-42688, MPU6050 | 6-axis |
| Pressure (optional) | FSR sensor | For squeeze detection |
| Wiring | I2C (IMU), Analog (pressure) | Along back of hand |

**Mounting:**
- Sensor location: fingernail or side of finger
- Wire routing: along back of hand to wrist
- Add strain relief at joints

**Output:** Stable motion data stream via BLE

**Estimated Time:** 1-2 weeks

---

### Phase 5: BLE Streaming + Integration

**Data Stream:**
- Frequency: 100–200 Hz
- Format: `timestamp, ax, ay, az, gx, gy, gz, pressure`

**Receiver:**
- Phone app (React Native BLE library)
- OR laptop script (Python/Node) for testing

**Processing:**
- Sliding window buffer
- Feed into classifier
- Output gesture labels

**Estimated Time:** 2-3 days

---

### Phase 6: Command Mapping Layer

**Purpose:** Convert gesture labels into Xander commands

**Mapping:**
```json
{
  "double_tap": "interrupt",
  "flick_up": "queue",
  "flick_right": "steer",
  "shake": "cancel",
  "hold": "voice_mode"
}
```

**Execution:**
- Call Xander API endpoint
- Update active session state
- Trigger appropriate response

**Integration with Xander Voice App:**
```typescript
// In React Native app
onGestureDetected(gesture: string) {
  switch(gesture) {
    case 'double_tap':
      xanderApi.interrupt();
      break;
    case 'flick_up':
      xanderApi.queue();
      break;
    case 'flick_right':
      xanderApi.steer();
      break;
    case 'shake':
      xanderApi.cancel();
      break;
    case 'hold':
      startVoiceInput();
      break;
  }
}
```

**Estimated Time:** 1 day

---

### Phase 7: UX Layer (Agent Control)

**Behavior:** Gesture = command, with optional voice follow-up

**Example Flow:**
```
double tap → interrupt
         → auto-open mic
         → user says: "make it shorter"
         → Xander responds with shorter answer
```

**Feedback:**
- Haptic buzz on gesture recognition
- Visual indicator in app
- Audio confirmation (optional)

**Estimated Time:** 2-3 days

---

### Phase 8: Iteration + Optimization

**Improve:**
- Gesture consistency
- Sensor placement
- False positive filtering

**Techniques:**
- Add wrist IMU for relative motion subtraction
- Smoothing filters (low-pass)
- Debounce logic
- Confidence thresholds

**Estimated Time:** Ongoing

---

### Phase 9: Miniaturization (Optional, Future)

**Only after system works reliably:**
- Design custom PCB
- Shrink sensors
- Integrate battery
- Explore ring form factor
- Consider watch integration

---

## Key Constraints

1. **Prioritize accelerometer + gyroscope** - proven, reliable
2. **Sampling rate must be >100 Hz** - gesture detection requirement
3. **Consistent sensor placement is critical** - affects model accuracy
4. **Avoid adding unnecessary sensors early** - complexity creep
5. **Hardware is NOT the bottleneck** - software/ML is harder

---

## Success Criteria

| Metric | Target |
|--------|--------|
| Gesture accuracy | >90% |
| Latency | <200ms |
| False positive rate | <5% |
| Battery life | >8 hours active use |
| Comfort | Wearable for extended periods |

---

## Repository Structure

```
autoxan/
├── mobile/                    # Xander Voice App
│   └── src/
│       └── gestures/          # Gesture integration
├── gesture-ring/              # Gesture Ring System (future)
│   ├── data-collection/       # Training data
│   ├── models/                # ML models
│   ├── firmware/              # MCU code
│   └── receiver/              # BLE receiver scripts
└── plans/
    ├── xander-voice-app-plan.md
    └── gesture-ring-plan.md   # This document
```

---

## Next Steps

1. **Immediate:** Keep placeholder buttons in Xander Voice App
2. **Phase 1:** Add phone IMU gesture detection as alternative input
3. **Phase 4+:** Build hardware prototype when software is proven

---

## Resources

- [Seeed XIAO nRF52840](https://wiki.seeedstudio.com/XIAO_BLE/)
- [BMI270 IMU](https://www.bosch-sensortec.com/products/motion-sensors/imus/bmi270/)
- [TensorFlow Lite for Microcontrollers](https://www.tensorflow.org/lite/microcontrollers)
- [React Native BLE Library](https://github.com/dotintent/react-native-ble-plx)
