# Wormhole Stream - Supabase Setup Guide

## Quick Setup (5 minutes)

### 1. Create Supabase Project (Free)
1. Go to [supabase.com](https://supabase.com) and sign in with GitHub
2. Click **New Project**
3. Choose a name (e.g., "wormhole-stream") and set a database password
4. Wait 2-3 minutes for setup to complete

### 2. Get Your API Keys
1. Go to **Project Settings** → **API**
2. Copy the **Project URL** → paste into `.env` as `VITE_SUPABASE_URL`
3. Copy the **anon public** key → paste into `.env` as `VITE_SUPABASE_ANON_KEY`

### 3. Set Up Database Tables (Optional)
Go to **SQL Editor** and run:

```sql
-- Users profile extension
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  username TEXT UNIQUE,
  avatar_url TEXT,
  subscription_tier TEXT DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stream sessions
CREATE TABLE IF NOT EXISTS streams (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  stream_key TEXT UNIQUE,
  title TEXT,
  is_live BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE streams ENABLE ROW LEVEL SECURITY;

-- Allow users to read/write their own data
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can view own streams" ON streams FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create streams" ON streams FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### 4. Enable OAuth Providers (Optional)
1. Go to **Authentication** → **Providers**
2. Enable **Google** and/or **GitHub**
3. Follow the OAuth setup instructions for each

---

## Android Build

### Prerequisites
- [Android Studio](https://developer.android.com/studio) installed
- Android SDK 34+ installed

### Build APK
```bash
cd wormhole-front

# Build web app
npm run build

# Sync with Capacitor
npx cap sync android

# Open in Android Studio
npx cap open android
```

In Android Studio:
1. Wait for Gradle sync to complete
2. Go to **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
3. APK will be in `android/app/build/outputs/apk/debug/`

---

## Streaming Setup (ngrok)

### Start Local Backend
```bash
docker-compose up -d
```

### Expose via ngrok
```bash
ngrok http 8080
```

Copy the ngrok HTTPS URL and use it in the app's **Server** field.

### Stream with OBS
- **Server:** `rtmp://localhost:1935/stream`
- **Stream Key:** `test` (or any name)
