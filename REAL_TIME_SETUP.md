# 🔴 REAL-TIME SETUP INSTRUCTIONS

## Problem
La page du jeu ne se met pas à jour en temps réel. Les changements ne s'affichent pas sans refresh manuel.

## Solution Applied ✅

The frontend code has been completely rebuilt with proper real-time synchronization:

### ✅ What Was Fixed

1. **useCallback for fetchGameData** - Memoized fetch function so subscriptions get the correct reference
2. **Separate subscription handlers** - Each event (INSERT, UPDATE, DELETE) has its own handler
3. **Debounced fetch (100ms)** - When multiple changes come at once, they batch together (prevents excessive fetches)
4. **Explicit console logging** - Shows exactly when data is fetched and from what event
5. **Timeout cleanup** - Prevents memory leaks from pending timeouts

### Code Changes Made

**In pages/Game.tsx:**
- ✅ Created `fetchGameData()` with `useCallback` (memoized)
- ✅ Created `debouncedFetchGameData()` wrapper
- ✅ Split subscriptions into separate `.on()` handlers for INSERT, UPDATE, DELETE
- ✅ All handlers call `debouncedFetchGameData()` (not `fetchGameData()`)
- ✅ Added `fetchTimeoutRef` to track debounce timer
- ✅ Added cleanup useEffect for timeout on unmount
- ✅ Added detailed console.logs: `🟢`, `🔄`, `🔴`, `🏆`, `💬`, `⚙️`, `⏭️`

## CRITICAL: Execute SQL in Supabase

Without this step, **NOTHING WILL WORK**. The tables don't exist yet.

### Step 1: Open Supabase Dashboard
Go to: https://app.supabase.com → Select your project

### Step 2: Open SQL Editor
Click: **SQL Editor** (left menu) → Click **+ New Query**

### Step 3: Copy & Execute SQL
1. Open this file: `spin-game-setup.sql` in your project
2. Copy **ALL the content**
3. Paste into the Supabase SQL Editor
4. Click **RUN**

**Expected:** The query should execute successfully (green checkmark)

⚠️ If you see errors about "table already exists", **that's OK**. Just continue.

### Step 4: Verify Tables Were Created
In Supabase Dashboard:
1. Go to **Database → Tables**
2. You should see these new tables:
   - ✅ game_rounds
   - ✅ game_participants
   - ✅ game_winners
   - ✅ game_chat_messages
   - ✅ game_admin_settings

If you don't see them, the SQL didn't execute correctly. Try again.

## CRITICAL: Enable Realtime for Tables

This is the **most important step**. Without it, subscriptions won't work.

### Step 1: Go to Replication Settings
In Supabase Dashboard:
1. Click **Database** (left menu)
2. Click **Replication**

### Step 2: Enable Each Table
Scroll down and find each table. Toggle **ON** for:

- ✅ **game_rounds** → Toggle to ON
- ✅ **game_participants** → Toggle to ON  
- ✅ **game_winners** → Toggle to ON
- ✅ **game_chat_messages** → Toggle to ON
- ✅ **game_admin_settings** → Toggle to ON

The toggle should turn **green** and say "Enabled".

### Step 3: Wait 30 Seconds
After enabling, wait a moment for Supabase to replicate your settings.

## CRITICAL: Check Row-Level Security (RLS)

RLS policies control who can access each table.

### Step 1: Verify RLS is Enabled
1. Go to **Database → Tables**
2. Click **game_participants**
3. Look at the top-right: Should say **"RLS enabled"** in red/yellow

If it says "RLS disabled":
1. Click the RLS toggle to turn it **ON**
2. The SQL script should have created policies automatically

### Step 2: Verify Policies Exist
Still in the **game_participants** table:
1. Click **Policies** tab (top)
2. You should see policies like:
   - `Participants: Users can read their own data`
   - `Participants: Admins can read all`
   - etc.

If you see **"No policies"**, the SQL script didn't create them. Run the SQL again.

### Step 3: Repeat for Other Tables
Repeat steps 1-2 for:
- game_winners
- game_chat_messages
- game_admin_settings

## Test the Real-Time Updates

### Scenario 1: Register a Participant

**Tab 1 - Normal User:**
1. Open: http://localhost:3001/#/game
2. Log in with a user account (not admin)
3. Press F12 (Developer Tools)
4. Go to **Console** tab
5. Click **"S'inscrire"** button

**Tab 2 - Admin:**
1. In a new browser tab, open: http://localhost:3001/#/game
2. Log in as admin
3. Watch the **"LISTE D'ATTENTE"** section

**Expected Results:**

Tab 1 Console should show:
```
✅ Participants fetched: 1
🟢 NEW PARTICIPANT: {new_record: {...}}
⏱️ Fetching data after debounce...
```

Tab 2 Admin should see:
- ✅ New participant appears in "LISTE D'ATTENTE"
- ✅ Fade-in animation plays
- ✅ Online counter increases (👥 X en ligne)
- ✅ LIVE badge pulses
- ✅ All happens **instantly** (within 1 second)

### Scenario 2: Admin Accepts Participant

**Tab 2 Admin:**
1. Click "OK" button next to participant in LISTE D'ATTENTE
2. Check console for logs

**Expected Results:**

Tab 1 & Tab 2 should both see:
- ✅ Participant moves to "PARTICIPANTS VALIDÉS"
- ✅ Participant appears with fade-in animation
- ✅ Status changes to "✓ Accepté"
- ✅ "OK" button disappears
- ✅ WAITING count decreases
- ✅ ACCEPTED count increases

### Scenario 3: Chat Message

**Both Tabs:**
1. An ACCEPTED participant types a message in CHAT
2. Click "Envoyer"
3. Watch both consoles

**Expected Results:**

Both tabs should see:
- ✅ Message appears in chat **instantly**
- ✅ Both see the exact same message
- ✅ No refresh needed
- ✅ Messages are in chronological order

## Debug Console Logs

When everything works correctly, you should see these logs:

```
// Initial load:
✅ Participants fetched: 0

// User registers:
🟢 NEW PARTICIPANT: {new_record: {status: "WAITING", ...}}
⏱️ Fetching data after debounce...
✅ Participants fetched: 1

// Admin accepts:
🔄 PARTICIPANT UPDATED: {new_record: {status: "ACCEPTED", ...}}
⏱️ Fetching data after debounce...
✅ Participants fetched: 1

// New winner:
🏆 NEW WINNER: {new_record: {...}}
⏱️ Fetching data after debounce...
✅ Participants fetched: 1

// New chat message:
💬 NEW MESSAGE: {new_record: {message: "Hello", ...}}
⏱️ Fetching data after debounce...
✅ Participants fetched: 1
```

## If It Still Doesn't Work

### Checklist 1: SQL Execution
```sql
-- Paste this in Supabase SQL Editor to verify tables exist:
SELECT COUNT(*) FROM game_participants;
```
Should return a number, not an error.

### Checklist 2: Realtime Enabled
1. Supabase Dashboard → **Database → Replication**
2. Check each game table has toggle **ON**

### Checklist 3: RLS Policies
1. Supabase Dashboard → **Database → Tables → game_participants**
2. Click **Policies** tab
3. Should see at least 3-4 policies

### Checklist 4: Network Connection
1. Press F12 → **Network** tab
2. Filter for: "ws" (WebSocket)
3. Should see a connection to: `wss://...realtime-v1.supabase.co...`
4. Status should be: **101 Switching Protocols** (green)

### Checklist 5: Browser Console Errors
1. Press F12 → **Console** tab
2. Look for red error messages
3. Common errors:
   - "relation ... does not exist" → SQL wasn't executed
   - "new unauthorized" → RLS is blocking access
   - "WebSocket connection failed" → Network issue

## Still Need Help?

Check the **REAL_TIME_DEBUG.md** file in the same directory for:
- Detailed testing steps
- Common issues and fixes
- How to simulate events
- Success indicators

