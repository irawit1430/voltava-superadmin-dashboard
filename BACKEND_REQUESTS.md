# Backend requests — Voltava Drive super-admin console

Written after a full frontend rebuild (16 Aug 2026). Everything the frontend
could fix on its own has been fixed. What's left needs API work.

Each item says what the console does **today** without it, so you can judge
priority. Nothing here is blocking a deploy — the frontend degrades honestly in
every case — but the P1 items are covering real gaps with workarounds.

---

## Closed — confirmed by backend, 16 Aug 2026

- **`GET /api/schools/:id`** — shipped. The profile page's search fallback is now
  a backstop, not the main path.
- **Server-side status filtering** on `/api/schools` and `/api/devices` — shipped.
  The "filtering isn't supported" banner should never appear now; if it does,
  the filter has regressed.
- **`PUT /api/schools/:id` 500** — fixed.
- **School contact fields** — `contactEmail`, `contactPhone`, `email`, `phone`,
  `website`, `pincode`, `latitude`, `longitude` all exist on the model and are
  accepted by the `createSchool` Zod schema. Wired into both the Add and Edit
  forms.
- **Status casing** — confirmed `ACTIVE | PENDING | SUSPENDED`, enforced by a Zod
  enum. The frontend sends uppercase and displays it title-cased.

Items 1, 2, 3 and 5 in the P1 list below are kept for history — they're done.

---

## P1 — the console is working around a missing capability

### 1. `GET /api/schools/:id`

**Need:** fetch a single school by ID.

**Today:** the profile page tries this endpoint, and if it 404s or errors it
falls back to `GET /api/schools?search=<id>&limit=100` and searches the results
by hand. That's two round trips and it breaks if search doesn't match on ID.

> Historical note: the old code did `list.find(s => s.id === id) || list[0]` on an
> unpaginated list — so a school past page one rendered a *different* school's
> data under the requested URL, and editing wrote one school's values to
> another school's ID. That fallback is gone. This endpoint replaces the
> workaround that took its place.

### 2. Server-side `status` filter on `/api/schools` and `/api/devices`

**Need:** `?status=ACTIVE` / `?status=ONLINE` filtering applied before
pagination.

**Today:** the console sends `status` and then checks whether the returned rows
actually honour it. When they don't, it shows the operator a banner reading
*"status filtering isn't supported by the API yet — these results are
unfiltered"*. Working, but it's an apology instead of a feature.

**Why it can't be done client-side:** with 500 devices at 25/page, filtering the
current page means an admin selecting "Offline" sees whichever 3 of 60 happen to
be on page 1 — and the result set changes as they paginate.

### 3. `PUT /api/schools/:id` returning 500

**Need:** the fix that's been outstanding since the original `APP_CONTEXT.md`.

**Today:** Edit Profile surfaces whatever the server says. The frontend no
longer hardcodes *"(500 Error). Please inform the backend team."* — but if the
endpoint is still broken, the operator now sees the real 500 message instead.

### 4. Which socket event carries alerts?

**Need:** confirm the event name emitted for SOS / system alerts.

**Today:** `FleetProvider` subscribes to `notification`, `notification_new`,
`alert`, `sos_alert` and `sos` — a guess — and polls `GET /api/notifications`
every 60 seconds plus on window focus as the guaranteed path.

**Why it matters:** SOS latency is currently up to 60 seconds. Before this
rebuild it was *until someone pressed F5*, because notifications were fetched
once on mount and never again. One confirmed event name makes it instant.

### 5. School contact fields on the school record

**Need:** `contactEmail`, `contactPhone`, `website`, `pincode`, `latitude`,
`longitude` — readable on `GET` and writable on `PUT`.

**Today:** the profile page shows *"Not provided"* for each, and the location
panel shows *"No coordinates on record"* instead of a map.

> These six fields were previously **fabricated in the frontend** — the address
> was hardcoded to `1242 Education Plaza, {city}, {state} 62704`, the email was
> generated as `j.moore@{schoolname}.edu` and rendered as a live `mailto:` link,
> the phone was a hardcoded `+1 (217) 555-0192`, and the "map" was a stock
> Unsplash photo. All removed. The console now shows the truth, which is that
> the data isn't there.

### 6. `PUT /api/admins/:id` — confirm scope

**Need:** confirm it accepts (a) `name` / `email` / `role` / `schoolId` for
profile edits, and (b) `password` on its own for a reset.

**Today:** the console now has an Edit Admin dialog and a Reset Password dialog,
both calling this endpoint. `APP_CONTEXT.md` documents it as available but the
old UI never called it, so it's unverified against a live server.

**Why it matters:** "school admin forgot their password" is a weekly ticket, and
before this the only remedy in the console was delete-and-recreate — which
changes the admin's ID and orphans anything referencing it.

---

## P2 — the console works, but a number on screen is narrower than its label

### 7. Counts by status on `/api/schools`

**Need:** either a `GET /api/schools/summary` returning
`{ total, active, pending, suspended }`, or those counts alongside `total` in
the list envelope.

**Today:** the Active / Pending KPI tiles count the rows currently loaded and
are labelled *"Within the 25 shown"* so the basis is explicit.

> Previously these sat next to a server-wide `total` with no indication they
> were different populations — "230 schools / 41 active" read as 189 inactive
> when the truth was 41 out of the 50 then visible.

### 8. Fleet-wide device counts

**Need:** `GET /api/devices/summary` → `{ total, online, offline, staleOver30m }`.

**Today:** same treatment — Online and "Silent over 30 min" are labelled
*"Within the 25 shown"*.

### 9. `?schoolId=` filter on `/api/devices`

**Today:** the school profile requests `?schoolId=<id>&limit=200` and then
filters the response client-side as a guard, so another school's hardware can
never appear. Works, but it's fetching more than it needs.

### 10. `?assigned=false` filter on `/api/devices`

**Today:** the Assign Device picker requests `?assigned=false&limit=500` and
filters for `!schoolId` client-side. If the server caps the page size below the
number of unassigned devices, some become invisible in the picker.

### 11. `sort` / `order` on `/api/schools`

**Need:** `?sort=createdAt&order=desc`.

**Today:** the dashboard's "Recently onboarded schools" sends these params and
takes whatever comes back. If they're ignored, the heading is a claim the query
doesn't make.

### 12. `?search=` on `/api/admins`

**Today:** the admins search box sends `search` and shows whatever returns. With
a growing admin list this needs to be real.

### 13. `lastLoginAt` on the admin record

**Today:** the "Last sign-in" column shows "Never" for everyone.

**Why it matters:** it's how you find dormant accounts worth deactivating.

### 14. Settings fields to persist and honour

**Need:** `mapDefaultZoom`, `overspeedLimitKph`, `offlineAlertMinutes`,
`alertEmail` added to `GET`/`PUT /api/settings`.

**Today:** the console sends them and falls back to defaults (zoom 10, 60 km/h,
30 min) if they come back missing.

**Also:** `maintenanceMode` needs enforcing server-side — reject `SCHOOL_ADMIN`
and driver logins while it's on. The frontend now shows a banner when it's
enabled, but a banner is not an access control.

> Both `mapCenterLat`/`mapCenterLng` and `maintenanceMode` already saved fine.
> Nothing read them back — the map hardcoded Delhi and maintenance mode had no
> effect anywhere. The frontend now consumes both.

---

## P3 — consistency, and one thing to verify

### 15. Role enforcement per endpoint — please confirm

The `SUPER_ADMIN` check happens in the browser after a successful login, and the
route guard only checks that a token *exists*. A school admin who writes their
own valid token into `localStorage` will load this entire console.

Whether that exposes anything depends completely on backend enforcement. Given
these endpoints can delete schools and admins, worth confirming explicitly
rather than assuming. Expected behaviour: every `/api/admin/*`, `/api/schools`
write, `/api/devices` write and `/api/admins` route returns **403** for a
non-super-admin token.

### 16. 401 vs 403 semantics

- **401** = token missing, expired or invalid → the console signs the user out
  and redirects to login with *"Your session expired."*
- **403** = valid token, insufficient role → the console shows *"You don't have
  permission…"* inline and stays put.

Returning 401 for a permission problem will log people out mid-task. Returning
403 for an expired token will strand them on a screen that can't recover.

### 17. One list envelope everywhere

Endpoints currently return either a bare array or `{ data, total }`. The client
normalises both (`toPage()` in `src/lib/api.ts`), so this isn't urgent — but one
shape means one less thing to get wrong. Suggested: `{ data: [...], total: n }`
everywhere, always.

### 18. Consistent status casing

`School.status` and `Device.status` should have one documented casing —
`ACTIVE` / `PENDING` / `SUSPENDED`, `ONLINE` / `OFFLINE`.

The frontend now compares through `normaliseStatus()` and falls back to a
neutral badge showing the raw value, so a casing change can't break it.

> It could before: the old code was a two-branch ternary that fell through to
> the "Suspended" style, so `ACTIVE` instead of `Active` would have painted the
> entire directory red and pinned both KPI counters to zero, with no error
> anywhere on screen or in the console.

### 19. Confirm the mock endpoints are real now

`APP_CONTEXT.md` lists `GET /api/search`, `GET /api/notifications` and
`POST /api/notifications/:id/resolve` as mocked in `server.ts`. That mock block
has since been removed with the comment *"backend is ready"*. Please confirm all
three are live on `api.voltava.in`, since the console depends on them.

### 20. CORS posture

`VITE_API_URL` is baked into the bundle, so the browser calls `api.voltava.in`
directly and the `server.ts` proxy is bypassed. The Firebase deploy serves
`dist/` statically, so `server.ts` isn't running in production at all.

That means CORS on the API has to allow the Firebase hosting origin directly.
Worth confirming which of the two deployment models we're committing to.

---

## New, opened 16 Aug 2026 after the School schema landed

### 21. Device model + `createDevice` Zod schema

We got the School model; we need the Device equivalent:

    sed -n '/^model Device/,/^}/p' prisma/schema.postgresql.prisma

**Why:** the reply said `POST /api/devices` doesn't accept `serialNumber` and
suggested mapping `serialNumber` → `deviceId`. We have **not** done that, because
they're different identifiers: `deviceId` is how the platform addresses the unit,
`serialNumber` is what's physically printed on it for RMA and warranty. Folding
one into the other means an RMA can't be traced back to a platform record.

What we did instead: removed the serial number input from the provisioning form,
since sending a field the API drops is worse than not offering it. The device
tables still have a Serial number column because `GET` may still return it.

Please confirm one of:
- `serialNumber` exists on the Device model → add it to `createDevice` and we'll
  restore the input, or
- it doesn't exist at all → we'll drop the column and stop referencing it.

### 22. `email`/`phone` vs `contactEmail`/`contactPhone` — which is authoritative?

The School model has both pairs. We've assumed:
- `contactEmail` / `contactPhone` = the named `contactPerson`'s own details
- `email` / `phone` = the school's general office line

The Add and Edit forms are labelled that way ("Their email" vs "Office email").
If that's backwards, or if one pair is legacy and should be ignored, tell us
before real data goes in — otherwise contacts land in the wrong column and
nobody notices.

### 23. Are `activeBuses` / `totalBuses` returned on the school payload?

They aren't columns on the model — the relations are `buses Bus[]`. The schools
table and dashboard render `school.activeBuses`, so if the API doesn't compute
and return them, every school shows 0 buses.

If they're computed, say so and we'll leave it. If not, we need either those two
counts on the list payload, or the summary endpoint in item 7.

### 24. Onboarding fields the product needs but the model doesn't have

Not blocking, but these are real gaps for a school-bus product. Roughly in
priority order:

1. **School start / end timings** and **operating days**. This is the big one.
   Without it nothing can distinguish a normal silent device from an alarming
   one — a bus quiet at 14:00 is parked, the same bus quiet at 07:15 means
   children are waiting. `offlineAlertMinutes` in Settings is currently one flat
   global number precisely because there's no per-school schedule to compare
   against.
2. **Transport in-charge** as a contact distinct from `contactPerson`. At 07:00
   you call the transport in-charge, not the principal.
3. **Expected bus count** — "3 devices reporting" is meaningless without knowing
   whether 3 or 12 were expected.
4. **Board / affiliation** (CBSE, ICSE, State, IB) and affiliation number — how
   schools are officially identified.
5. **Legal entity name, GSTIN** — the invoice goes to the trust or society, whose
   name usually differs from the school's.
6. **Contract start date, plan tier** — nothing captures the commercial
   relationship today.

If any of these are planned, tell us the field names up front and we'll build the
form once instead of twice.

---

## Not asks — just so you know what changed on our side

- All 30 hand-written `fetch` calls now go through one client (`src/lib/api.ts`)
  with typed responses, request cancellation, and error normalisation.
- `res.ok ? res.json() : []` is gone everywhere. A failed request no longer
  renders identically to an empty account.
- `drop: ['console']` was removed from `vite.config.ts` — production builds
  previously stripped every `console.error`, and every error handler in the app
  was `.catch(console.error)`, so live failures left no trace anywhere.
- The dashboard's three permanent green badges now read real socket state. When
  the connection drops, markers grey out and the UI says positions are frozen.
- `vite.config.ts` and `server.ts` now share one `API_TARGET` env var. They
  previously pointed at different hosts.
