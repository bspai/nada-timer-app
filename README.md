# Nada Timer

A mindful focus companion — a meditation and focus timer app built with React Native and Expo.

## Features

- **Customizable timer** — set duration from 1 to 60 minutes using an interactive slider
- **Ambient sound library** — choose from curated soundscapes (Naad Wave, Forest Hum, Lunar Tide) that play during your session
- **Animated progress ring** — circular SVG countdown ring with smooth visual feedback
- **Session templates** — save, edit, and delete named timer presets (e.g. "Morning Ritual") stored locally on device
- **Settings page** — placeholder for user preferences (in progress)
- **Login screen** — email/password entry with client-side validation

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Expo](https://expo.dev) ~54 / React Native 0.81 |
| Navigation | [Expo Router](https://expo.github.io/router) v6 |
| Audio | `expo-av` |
| Local storage | `@react-native-async-storage/async-storage` |
| Backend (optional) | [Supabase](https://supabase.com) — audio storage via signed URLs |
| UI | React Native + `expo-linear-gradient`, `react-native-svg`, `@react-native-community/slider` |
| Language | TypeScript |

## Project Structure

```
app/
  _layout.tsx      # Root layout (Expo Router)
  index.tsx        # Login screen
  timer.tsx        # Main timer screen
  settings.tsx     # Settings screen
assets/
  lotus.png        # App logo
  naad-wave.mp3    # Bundled ambient sound
utils/
  storage.ts       # AsyncStorage helpers for templates + Supabase client
```

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator, Android Emulator, or the [Expo Go](https://expo.dev/go) app

### Install

```bash
npm install
```

### Environment Variables

Create a `.env` file in the project root for Supabase integration (optional):

```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Run

```bash
# Start the Expo dev server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Run in browser
npm run web
```

## Sound Attribution

The bundled sound **Naad Wave** is based on *"30 minute relaxation music mix #3.wav"* by [ZHRØ](https://freesound.org/people/ZHR%C3%98/), licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
