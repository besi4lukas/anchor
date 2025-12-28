# Aim — Project Context (Source of Truth)

## One-liner
Aim is a productivity-first note + goal system for students and young professionals:
capture thoughts fast (voice or typing), store as Notes, and turn Notes into Goals.

## Audience
- Students
- Young professionals
- People who want lightweight productivity (not “wellness journaling”)

## Core Concepts (Language matters)
- **Notes**: raw thoughts, ideas, quick captures, meeting notes, brain dumps.
- **Goals**: structured actions/outcomes created from Notes.
- Avoid wording like: “journaling”, “tasks”, “to-do” (unless intentionally used in UI).
- The app name is **Aim** (not Anchor).

## Product Principles
1. **Capture should be instant**
   - One tap opens capture ready-to-type (keyboard up, cursor in input).
2. **Voice-first**
   - Speaking is a first-class input option, not buried.
3. **Low friction, high clarity**
   - Minimal UI, premium feel (Tiimo-inspired polish).
4. **Action oriented**
   - Notes can be converted into Goals.

## UX Decisions (Current)
- Floating “beam” button opens `CaptureSheet`.
- `CaptureSheet` behavior:
  - On open: auto-focus TextInput so keyboard appears immediately.
  - Default state shows Speak button.
  - Reset/Send only appear **after the user has typed text** (not just focus).
  - If user taps Speak:
    - blur input / dismiss keyboard
    - show listening UI with pulsing gradient ring

## Navigation / Screens
- Today 
- To-do
- Me

## Architecture Direction
- Use Context for shared state:
  - `EntriesContext.tsx`
  - `TasksContext.tsx` (or a combined `AimContext.tsx` if preferred later)

## Current Tech Stack
- React Native + Expo
- React Navigation (Bottom Tabs)
- expo-linear-gradient
- Ionicons
- expo-font + Google Fonts (Inter, DM Serif Display)

## File Map (expected)
- `src/components/AnchorBeam.tsx` (floating capture button)
- `src/components/CaptureSheet.tsx` (capture UI)
- `src/screens/NotesScreen.tsx` (shows the note entry details)
- `src/screens/TodoScreen.tsx` (shows goals)
- `src/context/EntriesContext.tsx`
- `src/context/TasksContext.tsx`

## “Done means…”
- Capture feels instant (no awkward delays)
- UI is consistent across Notes and Goals
- No “class project” buttons/labels
- Names and copy reflect Aim (Notes + Goals)
