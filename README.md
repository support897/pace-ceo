# Pace Calendar — CEO (the owner's room)

The second hat (two-hat order, Ilse 14 Oct 22:50; pattern:
Personal Brand CEO-DASHBOARD-PATTERN v2 + CEO-DATA-CONTRACTS).

- A SEPARATE app on its own host, never mixed into the user app's
  build (CEO law, 15 Oct). Sign-in-only door; there is no other
  surface.
- Access rests on `_owner/config` alone (console-written uid pin).
  The app proves nothing itself: its count probe is answered only
  for the pinned owner, and the room renders only behind an
  answered probe.
- AGGREGATES ONLY: every number is a count/sum query or an
  owner-readable counter (spines' stamps, subscriptions, reviews,
  import tallies). No user's state document is reachable from
  here — the user app's rules put state at users/{uid}/data/state
  under an owner-blind match, deliberately.
- Activation (Pace, confirmed): the first of a completed calendar
  import · a first event created · a first check-in answered.
- R7: the Money section reads THIS app's subscriptions only
  (RevenueCat/IAP feed when payments exist) — dormant and honest
  until then. Failed payments are never estimated.
- Avatars: contracts §4 rows in avatars-feed.json (App Promo's
  drops); a sale counts only when the payment record names the
  piece; a piece missing a trust rail is flagged + excluded.
  Pace's tracked cast (cast book of record): Sam · Priya · Deb.
  Skip is the guide mascot — brand art only, never a tracked row.
- firebase.js is the user app's REST module, copied byte-for-byte;
  firebase-config.js is this app's own seam for the same project.

Batteries: tests/ceo-check.mjs (mock-driven) + the live OA/TW
battery on the test twin at the gates.
