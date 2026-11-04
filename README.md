# Confession Roulette (Safe & Sound) 🎙️⚡

> A synchronized, zero-cost multiplayer party game of secrets, quick reflexes, and ultimate immunity. Built with React (Vite), Tailwind CSS, HTML5 MediaRecorder, and Supabase (PostgreSQL, Realtime & Storage).

---

## 🎮 Game Concept & Rules

1. **Lobby:** The host creates a 4-letter room code. Friends join on desktop or mobile by entering the room code and their display name.
2. **Confession Stage:** Every player records a 15–30 second voice confession using their microphone. Audio is compressed into WebM/Opus blobs and securely uploaded to the storage bucket. A player cannot advance until their confession is locked and sealed.
3. **Round 1 Minigame (Reflex Duel):** All players participate in a synchronized reflex challenge. When the screen flashes from deep red to bright green after a random 2–6 second delay, players must tap instantly. False starts receive an automatic penalty.
4. **First Winner Crowned:** The player with the fastest reaction time in milliseconds is crowned **Winner 1**.
5. **The Twist / Immunity & Selection:**
   - **Winner 1 is granted absolute immunity:** Their confession audio is permanently masked and locked away in the vault—it will **NEVER** be played.
   - Winner 1 is prompted to pick a **2nd Winner** from the remaining participants.
   - The UI locks down for all other players with a suspense waiting screen: *"Winner 1 is choosing the second winner..."*
6. **Confession Reveal Stage:**
   - Winner 1 is prominently displayed with the **IMMUNE / SAFE** shield banner.
   - All other participants (including Winner 2 and all losing players) have their voice confessions revealed one by one in an interactive audio player queue that everyone in the room listens to together, with live waveform visualization and room emoji reactions.

---

## 🛠️ Tech Stack & Zero-Cost Architecture

- **Frontend:** React 19 (Vite), TypeScript, Tailwind CSS v4, Lucide React icons, Canvas Confetti
- **Audio Capture:** Native HTML5 `MediaRecorder` API with live `AudioContext` frequency analysis and volume visualizer bars
- **Backend & Sync:** Supabase (PostgreSQL database, Supabase Realtime channel subscriptions, and Supabase Storage bucket)
- **Local / Demo Fallback Mode:** Built-in `BroadcastChannel` + `localStorage` real-time sync engine allows full multiplayer testing across browser tabs without needing external credentials configured upfront!
- **Hosting Target:** Vercel / Netlify (100% Free Tier)

---

## 🚀 Quick Start (Local Development)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables (Optional for Supabase)
Copy the example environment file:
```bash
cp .env.example .env
```
Fill in your Supabase project credentials:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```
*(If no Supabase credentials are provided, the game automatically operates in multi-tab local broadcast mode!)*

### 3. Start Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser. You can open multiple windows or tabs to simulate multiplayer play right away!

---

## 🗄️ Supabase Backend Setup (5 Minutes)

1. Create a free project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** in your Supabase dashboard.
3. Open `supabase_schema.sql` from this repository, paste the contents into the SQL Editor, and click **Run**.
   - Creates the `rooms` and `players` tables.
   - Configures open Row Level Security (RLS) policies for multiplayer party play.
   - Adds `rooms` and `players` to the `supabase_realtime` publication.
   - Creates the `confessions` storage bucket with public read/write access for audio recordings.
4. Go to **Project Settings -> API** and copy the **Project URL** and **anon public key** into your `.env` file or deployment settings.

---

## 🌐 Deploy to Vercel / Netlify (Free Tier)

### Vercel Deployment
1. Push this repository to GitHub or GitLab.
2. Go to [vercel.com](https://vercel.com) and import the repository.
3. Add the Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Click **Deploy**!

### Netlify Deployment
1. Connect your repository on [netlify.com](https://netlify.com).
2. Set Build Command: `npm run build`
3. Set Publish Directory: `dist`
4. Add the environment variables under **Site configuration -> Environment variables**.
5. Deploy site!

---

## 📁 Project Structure

```
├── public/                 # Static assets
├── src/
│   ├── components/         # Game UI components
│   │   ├── AudioVisualizer.tsx   # Real-time microphone and playback equalizer
│   │   ├── Navbar.tsx            # Header, room code, connection badge, leave button
│   │   ├── LandingStage.tsx      # Create/join room, rules explanation
│   │   ├── LobbyStage.tsx        # Connected player roster, bot addition, host start
│   │   ├── RecordingStage.tsx    # 30s voice confession recorder & prompt shuffle
│   │   ├── MinigameStage.tsx     # Synchronized reflex duel (Red Light / Green Light)
│   │   ├── PickingStage.tsx      # Winner 1 immunity celebration & 2nd Winner selection
│   │   └── RevealStage.tsx       # Confession queue audio player with reactions
│   ├── hooks/
│   │   ├── useAudioRecorder.ts   # HTML5 MediaRecorder & AudioContext hook
│   │   └── useGameState.ts       # Room synchronization & game action dispatchers
│   ├── lib/
│   │   └── supabase.ts           # Supabase client initialization & connection detector
│   ├── services/
│   │   └── gameService.ts        # Supabase API + fallback multi-tab BroadcastChannel engine
│   ├── types/
│   │   └── game.ts               # Room, Player, and Phase TypeScript models
│   ├── App.tsx                   # Main game orchestrator & stage router
│   ├── index.css                 # Tailwind CSS v4 directives & styling
│   └── main.tsx                  # Application entry point
├── supabase_schema.sql     # Complete PostgreSQL schema, RLS, Realtime & Storage script
├── .env.example            # Environment variables template
├── package.json
└── vite.config.ts
```

---

## 🔒 Privacy & Safety Guarantee

- **Winner 1 Immunity:** Winner 1's audio file reference is permanently protected and never fed into the playback queue.
- **Microphone Permissions:** Streams are exclusively captured locally via standard browser media streams and properly stopped/released immediately upon completion.
