# Bravehearts Basketball Club — Implementation Plan

This plan tracks the remaining production-readiness work for the Bravehearts Basketball Club website/admin portal. We will follow this document in order unless a new urgent bug appears.

## Status Legend

- [ ] Not started
- [~] In progress
- [x] Done
- [!] Blocked / needs decision

---

## Phase 1 — Stabilize Current UI Bugs

### 1.1 Verify user website loads correctly

**Goal:** Make sure the public website no longer shows a black screen and has no JavaScript startup errors.

**Tasks:**
- [ ] Open public site homepage.
- [ ] Check browser console for JavaScript errors.
- [ ] Verify navigation works: Home, News, Roster, Fixtures, Gallery, Login, Fan Zone.
- [ ] Run `npm run build` locally when shell/build tooling is available.

**Acceptance Criteria:**
- Public site loads normally.
- No fatal JavaScript errors in console.
- Main routes render correctly.

---

### 1.2 Verify admin portal loads correctly

**Goal:** Confirm admin portal still works after recent changes.

**Tasks:**
- [ ] Open `admin.html`.
- [ ] Log in as admin.
- [ ] Check Dashboard, Schedules, Stat Sheet, News & Polls, Standings, Gallery, Notifications.
- [ ] Check browser console for errors.

**Acceptance Criteria:**
- Admin portal loads.
- Navigation works.
- Stat sheet opens for a game.

---

## Phase 2 — Custom Dialog System

### 2.1 Add polished dialog CSS

**Goal:** Replace ugly browser dialogs like “localhost says” with a branded modal.

**Files likely involved:**
- `src/index.css`
- `src/admin.css`
- `src/app.js`
- `src/admin-app.js`

**Tasks:**
- [ ] Add CSS for `.app-dialog-overlay`.
- [ ] Add CSS for `.app-dialog-card`.
- [ ] Add icon styles for success/warning/error/info.
- [ ] Add light mode styles.
- [ ] Add mobile responsive styles.
- [ ] Add focus/keyboard-friendly styles.

**Acceptance Criteria:**
- Dialog appears centered.
- Background is dimmed.
- Dialog matches Bravehearts styling.
- Text is readable in dark and light mode.
- Works on mobile.

---

### 2.2 Replace public website alerts/confirms/prompts

**Goal:** Public site should not use default `alert`, `confirm`, or `prompt`.

**Tasks:**
- [ ] Replace `alert()` calls in `src/app.js` with `notify()`.
- [ ] Replace `confirm()` calls in `src/app.js` with `ask()`.
- [ ] Replace mobile money `prompt()` with a styled input dialog.
- [ ] Ensure async dialog usage does not break event handlers.

**Acceptance Criteria:**
- No “localhost says” dialog appears on public site.
- Add-to-cart login prompt uses custom modal.
- Login/register/reset errors use custom modal.
- Payment instructions use custom modal.
- Mobile money number entry uses custom modal with input.

---

### 2.3 Replace admin portal alerts/confirms/prompts

**Goal:** Admin portal should also use styled dialogs.

**Tasks:**
- [ ] Add admin-safe dialog helper or share the public one.
- [ ] Replace delete confirmations.
- [ ] Replace save success alerts.
- [ ] Replace error alerts.
- [ ] Confirm admin light/dark mode styling.

**Acceptance Criteria:**
- Admin delete confirmation uses custom modal.
- Admin success/error messages use custom modal.
- No browser-native alert/confirm appears in admin workflows.

---

## Phase 3 — Light Mode Readability Audit

### 3.1 Public website light mode audit

**Goal:** Fix all unreadable white/light text in light mode.

**Pages to check:**
- [ ] Home
- [ ] News & Polls
- [ ] Roster
- [ ] Player profile
- [ ] Schedule & Standings
- [ ] Game stats
- [ ] Gallery
- [ ] Login/My Account
- [ ] Fan Zone
- [ ] Cart drawer
- [ ] Notifications dropdown

**Acceptance Criteria:**
- All text is readable in light mode.
- No white text on white cards.
- Buttons remain visually clear.

---

### 3.2 Admin portal light mode audit

**Goal:** Fix unreadable admin text in light mode.

**Pages to check:**
- [ ] Dashboard
- [ ] Orders
- [ ] Products
- [ ] Schedules
- [ ] Stat sheet
- [ ] Rosters
- [ ] Users
- [ ] News & Polls
- [ ] Standings
- [ ] Gallery
- [ ] Notifications
- [ ] Analytics
- [ ] Modal forms

**Acceptance Criteria:**
- Admin tables use dark text in light mode.
- Form labels and inputs are readable.
- Modal content is readable.
- Action buttons remain visible.

---

## Phase 4 — Player Images and Public Stats UI

### 4.1 Verify BH Men image mapping

**Goal:** Ensure BH Men images from `src/assets/bh men/` appear everywhere they should.

**Tasks:**
- [ ] Verify filename map in `src/components/roster.js`.
- [ ] Confirm public BH Men roster images show.
- [ ] Confirm public player profile images show.
- [ ] Confirm public game stats table images show.
- [ ] Confirm admin stat sheet images show.
- [ ] Confirm missing image fallback shows clean initials/avatar.

**Acceptance Criteria:**
- BH Men images show on public roster, player profile, user stats, and admin stat sheet.
- Missing images do not show broken image icons.

---

### 4.2 Improve public game stats table UI

**Goal:** Make user-facing game stats table easier to read.

**Tasks:**
- [ ] Add sticky player number/name columns if feasible.
- [ ] Improve mobile horizontal scrolling.
- [ ] Improve avatar spacing.
- [ ] Highlight top scorer.
- [ ] Add team totals row.
- [ ] Ensure PTS includes FTM.

**Acceptance Criteria:**
- Stats table is readable on desktop and mobile.
- Player names/images remain visible while scrolling horizontally.
- PTS calculation is correct.

---

## Phase 5 — Stat Sheet Logic and Validation

### 5.1 Confirm stat editing behavior

**Goal:** Stat inputs should not lose focus while editing.

**Current expected behavior:**
- Input remains active while typing/deleting.
- Saves on blur.
- Saves on Enter.
- Escape cancels and restores original value.
- Blank saves as `0`.

**Tasks:**
- [ ] Test editing normal stat field.
- [ ] Test deleting value to blank.
- [ ] Test Enter save.
- [ ] Test Escape cancel.
- [ ] Test focus does not jump after deleting.

**Acceptance Criteria:**
- User only exits the box when done editing.
- No unwanted rerender while typing.

---

### 5.2 Enforce stat calculations

**Goal:** Derived stats should be accurate.

**Rules:**
- PTS = `2PM * 2 + 3PM * 3 + FTM * 1`
- FGM = `2PM + 3PM`
- FGA = `2PA + 3PA`
- REB = `OREB + DREB`

**Tasks:**
- [ ] Confirm admin stat sheet uses these calculations.
- [ ] Confirm public game stats uses these calculations.
- [ ] Confirm backend stores derived values consistently if applicable.

**Acceptance Criteria:**
- PTS includes free throws.
- FGM/FGA/REB are correct.
- Public and admin views match.

---

### 5.3 Add stat validation

**Goal:** Prevent invalid stats.

**Validation Rules:**
- [ ] No negative numbers.
- [ ] Fouls max 6.
- [ ] 2PM cannot exceed 2PA.
- [ ] 3PM cannot exceed 3PA.
- [ ] FTM cannot exceed FTA.
- [ ] Numeric fields cannot save invalid text.

**Acceptance Criteria:**
- Invalid values show a useful message.
- Invalid values are not silently saved.
- User can correct input without losing focus unnecessarily.

---

### 5.4 Add stat save feedback

**Goal:** Admin should know whether stat changes saved.

**Tasks:**
- [ ] Add “Saving…” indicator.
- [ ] Add “Saved” state.
- [ ] Add error state.
- [ ] Highlight failed input.

**Acceptance Criteria:**
- Admin sees clear feedback after stat edits.
- Save failures are visible and actionable.

---

## Phase 6 — API and Environment Cleanup

### 6.1 Remove hardcoded localhost URLs

**Goal:** Make app deployable outside localhost.

**Current issue:**
Some frontend files call URLs like:

```js
http://localhost:3000/api/...
```

**Tasks:**
- [ ] Identify all hardcoded localhost URLs.
- [ ] Create/use a centralized API base URL.
- [ ] Prefer relative `/api/...` when frontend and backend share origin.
- [ ] Confirm WebSocket URL works in production.

**Acceptance Criteria:**
- App works on localhost and production domain.
- No frontend code depends directly on `localhost:3000`.

---

### 6.2 API response/error consistency

**Goal:** Make API errors consistent and frontend-friendly.

**Tasks:**
- [ ] Review backend error handlers.
- [ ] Ensure non-2xx status codes for errors.
- [ ] Avoid stack traces in responses.
- [ ] Align frontend error parsing with backend shape.

**Acceptance Criteria:**
- Errors show clear messages.
- No 200 responses with error bodies.
- No sensitive stack traces leak to users.

---

### 6.3 Pagination review

**Goal:** Avoid unbounded list endpoints.

**Endpoints to review:**
- [ ] Products
- [ ] Games
- [ ] Players
- [ ] News
- [ ] Gallery
- [ ] Standings
- [ ] Polls
- [ ] Notifications
- [ ] Orders
- [ ] Users

**Acceptance Criteria:**
- Large list endpoints support `pageSize`/`pageToken` or existing equivalent pagination.
- Frontend supports pagination or safe limits where needed.

---

## Phase 7 — Production Readiness

### 7.1 Build and test

**Tasks:**
- [ ] Run `npm install`.
- [ ] Run `npm run build`.
- [ ] Run `npm test`.
- [ ] Fix all build/test failures.

**Acceptance Criteria:**
- Build completes successfully.
- Tests pass or known failures are documented.

---

### 7.2 Manual QA checklist

**Public site:**
- [ ] Home loads.
- [ ] Register works.
- [ ] Login works.
- [ ] Forgot password works.
- [ ] News loads.
- [ ] Poll voting works.
- [ ] Roster/player pages load.
- [ ] Fixtures/standings load.
- [ ] Game stats load.
- [ ] Gallery/lightbox works.
- [ ] Cart/checkout flow works.
- [ ] Notifications work.
- [ ] Light/dark mode works.
- [ ] Mobile layout works.

**Admin portal:**
- [ ] Login works.
- [ ] Dashboard loads.
- [ ] Orders work.
- [ ] Products CRUD works.
- [ ] Schedules CRUD works.
- [ ] Stat sheet works.
- [ ] Rosters CRUD works.
- [ ] Users management works.
- [ ] News & Polls CRUD works.
- [ ] Standings CRUD works.
- [ ] Gallery CRUD works.
- [ ] Notifications send works.
- [ ] Analytics loads.
- [ ] Light/dark mode works.
- [ ] Mobile layout works.

---

## Phase 8 — Nice-to-Have Improvements

### 8.1 Toast notifications

**Goal:** Use small toast messages for lightweight events instead of modal dialogs.

**Examples:**
- Added to cart
- Saved successfully
- Copied reference
- Updated status

**Acceptance Criteria:**
- Modal dialogs are reserved for important confirmations/errors.
- Small success messages do not interrupt workflow.

---

### 8.2 Accessibility improvements

**Tasks:**
- [ ] Focus trap in modals.
- [ ] Escape closes modals.
- [ ] Visible focus states.
- [ ] ARIA labels for buttons.
- [ ] Alt text for images.
- [ ] Keyboard navigation for menus/dialogs.

**Acceptance Criteria:**
- Core flows are usable by keyboard.
- Modals are screen-reader friendly.

---

## Immediate Next Step

Start with **Phase 1.1** and **Phase 2.1**:

1. Confirm the user website loads.
2. Add proper CSS for the custom dialog.
3. Then replace remaining browser dialogs safely.
