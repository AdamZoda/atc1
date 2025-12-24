# 🔴 REAL-TIME DEBUGGING CHECKLIST

## Test Steps

### 1. Open Browser DevTools (F12)
- Go to **Console** tab
- Look for these console logs when changes happen:

```
✅ Participants fetched: X
🟢 NEW PARTICIPANT: {...}
⏱️ Fetching data after debounce...
```

### 2. Test in Two Browser Tabs

**Tab 1 - Normal User:**
- Open: http://localhost:3001/#/game
- Click "S'inscrire" (Register button)
- Watch the console

**Tab 2 - Admin Dashboard:**
- Open: http://localhost:3001/#/game
- Make sure you're logged in as admin
- Watch the "LISTE D'ATTENTE" section

### 3. Expected Real-Time Updates

When user clicks "S'inscrire" in Tab 1:

**Tab 1 Console:**
```
✅ Participants fetched: 1
🟢 NEW PARTICIPANT: {
  new_record: {
    id: "...",
    user_id: "...",
    username: "...",
    status: "WAITING"
  }
}
⏱️ Fetching data after debounce...
```

**Tab 2 (Admin) - Should Update Instantly:**
- New participant appears in "LISTE D'ATTENTE"
- "pendingCount" increases
- 👥 Online counter increases
- **Fade-in animation** plays on new participant

### 4. Test Each Zone

#### LISTE D'ATTENTE (Waiting List)
- [ ] New participants appear without refresh
- [ ] Participants have fade-in animation
- [ ] Admin sees "OK" button on hover
- [ ] Count updates correctly

#### PARTICIPANTS VALIDÉS (Accepted)
- [ ] When admin clicks "OK", participant moves to this section
- [ ] Participant appears with fade-in from left
- [ ] Count increases
- [ ] 👤 status shows "✓"

#### CHAT COMMUNAUTAIRE
- [ ] New messages appear without refresh
- [ ] Messages in reverse chronological order
- [ ] Only ACCEPTED participants can see/send (or have input disabled)

#### HISTORIQUE GAGNANTS (Winners)
- [ ] When spin ends, winner appears in this list
- [ ] Shows with timestamp
- [ ] Up to 10 winners displayed

#### Admin Zone Buttons
- [ ] PUBLIC/CACHÉ toggle - page visibility updates for all clients
- [ ] CHAT PUBLIC/CHAT STAFF - chat mode updates
- [ ] ACCEPTER TOUS - all WAITING become ACCEPTED instantly
- [ ] LANCER LE SPIN - spin animation starts, interface locks

### 5. If Nothing Updates

Check these in order:

#### A. Network Issues
- Press F12 → Network tab
- Look for WebSocket connection: `wss://...realtime...`
- Should show a connection with 101 Switching Protocols
- If not: **Realtime is NOT enabled in Supabase**

#### B. Console Errors
- Look for red errors in console
- If error mentions "relation does not exist": **SQL wasn't executed**
- If error mentions "RLS": **RLS policies are blocking access**

#### C. Supabase Status
- In Supabase Dashboard:
  1. Go to **Database → Tables**
  2. Click **game_participants**
  3. Check:
     - [ ] Table has data (click "Data" tab)
     - [ ] RLS is ON (toggle in top right)
     - [ ] At least one policy exists (click "Policies" tab)

#### D. Realtime Status
- In Supabase Dashboard:
  1. Go to **Database → Replication**
  2. Scroll to **game_participants**
  3. Check: Toggle should be **ON**
  4. If OFF, click it to enable

### 6. Simulate Events

#### Register a Participant
```javascript
// Run in console on game page:
document.querySelector('button:contains("S\'inscrire")').click()
```

#### Check Current State
```javascript
// Run in console:
console.log('Participants:', participants)
console.log('Online count:', onlineCount)
console.log('Game state:', gameState)
```

### 7. Debug Subscription

Add this to check if subscriptions are working:
```javascript
// In console, after page loads:
console.log('Checking subscriptions...');
// Should see subscription callbacks firing when you click buttons
```

---

## Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| No console logs appear | SQL wasn't executed | Execute `spin-game-setup.sql` in Supabase |
| Logs appear but no UI update | RLS blocking reads | Check RLS policies exist and are correct |
| WebSocket not connecting | Realtime not enabled | Enable in Supabase → Database → Replication |
| Data old after refresh | Supabase client outdated | Run `npm install @supabase/supabase-js@latest` |
| Participant appears 5+ seconds later | Debounce working (100ms wait) | This is normal! Multiple updates batch together |

---

## Success Indicators ✅

You'll know it's working when:

1. **Console shows logs immediately** (within 100-200ms)
2. **UI updates without page refresh**
3. **All zones update together** (list, count, chat, winners)
4. **Fade-in animation plays** on new items
5. **Admin sees changes instantly** across browser tabs

