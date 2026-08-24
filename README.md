# Language Transfer Companion

An interactive, lockscreen-compatible audio player and flashcard system designed specifically for language learning. It allows you to match your audio lessons with JSON transcripts, provides intelligent auto-pausing for practice, and includes a built-in Spaced Repetition System (SRS) for vocabulary flashcards.

## Features

- **Smart Auto-Pause:** Automatically pauses the playback just before it's your turn to speak, perfectly splitting the difference between the teacher's prompt and the student's response.
- **Bulk Folder Upload:** Upload an entire folder of MP3s and a folder of JSON transcripts. The app intelligently pairs them up.
- **Spaced Repetition Flashcards:** Add vocabulary as you learn. The app uses the SM-2 algorithm to schedule flashcards for optimal memory retention.
- **Local Storage:** All your courses, progress, and flashcards are securely stored locally in your browser using IndexedDB. No server database required.
- **Lockscreen & Headphone Controls:** Fully integrated with the MediaSession API. Play, pause, or skip backward/forward without looking at your screen.
- **Interactive Transcript:** The transcript auto-scrolls to keep the active word centered on your screen. Click any word to jump to that timestamp in the audio.

## Deployment (Render)

This application is a static Single Page Application (SPA) built with React and Vite. It is fully prepared to be hosted as a **Static Site** on [Render](https://render.com/).

### Option 1: One-Click Deploy (Blueprint)
This repository includes a `render.yaml` Blueprint to automatically deploy the app with the correct configurations.
1. Go to the Render Dashboard.
2. Click **New** -> **Blueprint**.
3. Select this repository. Render will automatically configure the build settings, static paths, and fallback routing.

### Option 2: Manual Setup
If you prefer to create the service manually on Render:
1. Create a new **Static Site** on Render.
2. Link your GitHub repository.
3. Set the **Build Command** to: `npm install && npm run build`
4. Set the **Publish Directory** to: `dist`
5. *Important for SPAs:* Go to the "Redirects/Rewrites" tab in your Render dashboard and add a rule to support client-side routing:
   - Source: `/*`
   - Destination: `/index.html`
   - Action: `Rewrite`

## Development
```bash
# Install dependencies
npm install

# Start the local development server
npm run dev

# Build for production
npm run build
```

## Tech Stack
- React 19
- Vite
- Tailwind CSS
- Lucide React (Icons)
- LocalForage (IndexedDB Storage)
