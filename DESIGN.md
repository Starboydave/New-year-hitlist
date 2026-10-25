# New Year Hitlist: iOS design

Platform: iPhone, SwiftUI, iOS 26 (Liquid Glass). iPad inherits via size classes.
Built on the existing README prototype (hit list, bounties, deadline countdowns, nag), with the neon-terminal skin replaced by a native one.

## Thesis

**One job:** pick a few resolutions, put a deadline on each, and strike them off.
**Remembered by:** the strike. Finishing a target draws a red ink line through its title, with one firm haptic. The struck lines pile up into a visible ledger of the year.

## What changes from the prototype, and why

| Prototype | iOS design | Reference |
| --- | --- | --- |
| Shaking, bouncing "STAGNATION DETECTED" modal after 10 s idle | Opt-in local notifications at times the user picks. No in-app alert on idle. | `alerts.md`, `managing-notifications.md`, Responsibility |
| Delete icon visible on hover only | Swipe row actions, plus a context menu | `lists-and-tables.md`, `context-menus.md` |
| Same 24 h countdown for every target | Real per-target deadlines (date picker) | Purpose |
| Neon red on slate, scanlines, all-caps mono | System type, semantic colors, light and dark | `color.md`, `dark-mode.md`, `typography.md` |
| Shake animation, no reduced-motion path | Strike animation is a fade when Reduce Motion is on | `motion.md`, `accessibility.md` |

The voice stays. Copy keeps the hit-list vocabulary (Targets, Strike, Open contracts), written in plain words.

## Structure

Tab bar, 3 tabs, all single words, filled symbols:

1. **Targets** (`scope`): open contracts, grouped by category.
2. **Ledger** (`list.bullet.rectangle`): struck targets by month, with streak and completion.
3. **Search** (`magnifyingglass`, role `.search`): the system search tab.

Toolbar on Targets: large title "2026 Hit List"; trailing **Add** (`plus`, prominent glass style). Overflow (sort, show struck, Settings) in one `Menu`. Settings is a sheet from that menu.

```
Targets (compact width)
┌──────────────────────────────┐
│ 2026 Hit List        [ + ]   │  large title, glass toolbar
│ 3 of 12 struck · 61 days left│  subheadline, secondary
│                              │
│ HEALTH                       │  section header
│ ┌──────────────────────────┐ │
│ │ ○  Run a half marathon   │ │  card: title 17 pt semibold
│ │    Due Oct 12 · 24 d left│ │  SF Mono 13 pt, red if < 7 d
│ ├──────────────────────────┤ │
│ │ ●  ~~Fix sleep schedule~~│ │  struck: red 2 pt line
│ └──────────────────────────┘ │
│ CAREER                       │
│ ...                          │
├──────────────────────────────┤
│ Targets   Ledger   🔍 Search │  tab bar
└──────────────────────────────┘
```

Regular width (iPad, landscape Max): `NavigationSplitView`, with the tab bar converting to a sidebar.

## Flows

- **Add target:** `+` opens a sheet (medium detent, grabber). Fields: title, category, deadline (compact `DatePicker`), reminder (Off / Daily / On deadline). Primary action "Add Target" in the toolbar, Cancel on the leading side.
- **Strike:** tap the circle, or swipe right on the row. Red line animates left to right over 0.35 s, with `.impact(.rigid)` haptic, then the row sinks to the bottom of its group. Undo via a toast (3 s) and shake-to-undo.
- **Edit and delete:** tap the row for a detail sheet. Swipe left for Delete. Delete is undoable, so there is no confirmation alert.
- **Empty state:** "No targets yet. Add the first thing you want to finish this year." with an Add Target button.
- **Reminders:** asked for in context, on the first target that sets a reminder, with a purpose string that says what will be sent and when. Never at launch.
- **Overdue:** the date turns red and the row gets an "Overdue" text label. It never uses color alone.

## Design tokens

Names are asset-catalog colors with light and dark variants plus high-contrast variants. Ratios computed from the hex values.

| Role | Name | Light | Dark | Contrast |
| --- | --- | --- | --- | --- |
| Background | `paper` | #F2F1EC | #101214 | n/a |
| Card | `card` | #FFFFFF | #1C1F22 | n/a |
| Content | `ink` | #14171A | #F1F0EB | 15.9:1 / 16.5:1 on paper |
| Secondary | `ink2` | #5B6168 | #A0A5AB | 5.5:1 / 7.6:1 on paper; 6.3:1 / 6.7:1 on card |
| Signal | `strike` | #C4151C | #FF5A52 | 5.4:1 / 6.1:1 on paper; 6.1:1 / 5.4:1 on card |
| Done | `struck` | #1F7A4D | #4FD08A | 5.3:1 / 8.5:1 on card |

- `strike` red means exactly two things: the ink line, and urgency (less than 7 days, overdue). It is not the app accent for buttons.
- App accent and prominent buttons use the system tint: `ink`-on-glass, no brand color on toolbars over colorful content (`color.md › Liquid Glass color`).
- White text on a `strike` fill is 6.1:1 (light). In dark, use `paper` text on `strike` fill, 6.1:1.

**Type** (all Dynamic Type, text styles only):

| Use | Style |
| --- | --- |
| Large title | `.largeTitle` bold, SF Pro |
| Target title | `.headline` (17 pt semibold) |
| Section header | `.footnote` semibold, uppercase, secondary |
| Deadline, counts | SF Mono via `.monospaced()` on `.subheadline` (15 pt) |
| Body, notes | `.body` (17 pt) |

Nothing below 11 pt. At accessibility sizes the card stacks title above deadline and wraps to as many lines as needed.

**Layout:** 16 pt side margins, 12 pt gap between cards, card radius 20 pt concentric with the screen corner, row min height 60 pt, circle control hit area 44 × 44 pt (visible circle 26 pt).

**Motion:** one orchestrated moment, the strike. Everything else uses system transitions. With Reduce Motion: cross-fade the line in over 0.15 s.

**Materials:** Liquid Glass only on the toolbar, tab bar and sheets, which are the system's. Cards are opaque. No custom blur.

## Accessibility checklist

- VoiceOver label per row: "Run a half marathon, Health, due October 12, 24 days left, not struck." Action: "Strike". Custom actions mirror the swipe actions.
- Struck state exposed as `.isSelected` plus the "Struck" text in the label, not only the line.
- Largest accessibility size, Increase Contrast, Reduce Transparency, Reduce Motion, and Dark Mode each have a defined result above.
- Haptic is never the only feedback: the line and the sort move are visible.

## Copy

| Element | Text |
| --- | --- |
| Nav title | 2026 Hit List |
| Add button | Add Target |
| Strike action | Strike |
| Struck state | Struck |
| Overdue | Overdue |
| Reminder permission rationale | "Hit List sends a reminder on the days you choose for targets with reminders turned on." |
| Undo toast | "Struck. Undo" |

Action names stay consistent through the flow: Add Target produces a target, Strike produces Struck.

## Self-critique

- Would this plan fit any to-do app? The strike, the ledger, and the deadline-first rows are specific to a hit list. The palette is plain on purpose: boldness is spent on the red line only.
- Removed: category icons, the progress ring, and the per-row bounty tag. None earned a place.
- Open question: gamified streaks. Left out of v1 as they pressure the user (Responsibility).

## Build order

1. Data model (`Target`: title, category, deadline, reminder, struckAt) and SwiftData store.
2. Targets list with strike interaction.
3. Add / edit sheet and local notifications.
4. Ledger and Search.
5. Accessibility pass and iPad split view.
