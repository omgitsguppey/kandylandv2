# Real-Time Architecture & Self-Healing

**Goal:** Remove repetitive, heavy polling mechanisms where native Realtime/Firestore listeners work better. Guarantee the system explicitly alerts when something is wrong by self-snitching.

## Checklist

### 1. Hot vs Cold Architecture
- **Hot Data (Moves to Listeners):**
  - [ ] Notification streams.
  - [ ] Deep chat conversations & thread unreads.
  - [ ] Wallet balance deltas (critical after a write success).
  - [ ] Live drop availability (user-facing).
  - [ ] Admin queues / moderation tables.
- **Cold Data (Persist through Fetches/Rollups):**
  - [ ] Historical charts.
  - [ ] Long-range revenue summaries or historical archived lists.
  - [ ] A/B testing configurations that rarely mutate post-load.

### 2. Realtime Cleanup
- [ ] Remove stacked intervals and orphaned polling loops.
- [ ] Guarantee listeners run reliable teardowns on Unmount, Route Switch, or Auth Change.
- [ ] Where polling *must* remain, document the reason explicitly and enforce intelligent throttling.

### 3. Self-Debugging & "Snitching"
- [ ] Audit module loads: The application must log internally if a UI module maps to empty data it expected to be populated.
- [ ] Watch subscription pulses: Set alerts if a realtime stream goes dead, or drops parity metrics.
- [ ] Never classify a broken system correctly falling back as "healthy". Stale data, fallback components, and offline structures MUST carry explicit internal markers reflecting their truth level.
- [ ] Ensure error boundaries don't swallow recoverable logic blindly without an audit trail. 
- [ ] Enforce automated retry wrappers with exponential backoff on transient network fetch fails, logging specifically when retries exhuast natively.
