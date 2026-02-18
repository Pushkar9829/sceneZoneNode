# User Role Removal – Phased Plan

This document describes how to remove **all User-role features** from the SceneZone backend and from every panel (Admin, Artist, Host). After removal, the app will support only **Host** and **Artist** (plus **Admin**).

---

## Summary of What “User” Means Here

- **User** = the attendee role: browse events, book tickets, favourite events, guest list, payment details, event dashboard.
- **Removal scope**: Delete the User module, all `/api/user/*` routes, and every feature that depends on or exposes the User role in Admin, Artist, Host, and shared modules.

---

## Phase 1: Remove User Panel (User Module)

**Goal:** Remove the entire User module and all `/api/user/*` routes.

### 1.1 Server entry (`server.js`)

- Remove requires:
  - `userAuthentication`, `userProfile`, `userFavouriteEvent`, `userPaymentDetails`, `eventDashboard`, `filterRoutesUser`
- Remove route mounts:
  - `app.use('/api/user/auth', ...)`
  - `app.use('/api/user', [userProfile, userFavouriteEvent, userPaymentDetails])`
  - `app.use('/api/user/eventDashboard', eventDashboard)`
  - `app.use('/api/user/event', filterRoutesUser)`

### 1.2 Delete User module directory

Delete the whole folder:

- `User/` (controllers, models, routes: Auth, event, FavouriteEvent, filterEvent, PaymentDetails, Profile, guestList, eventDashboard, favouriteEvent, filter, paymentDetails, userProfile)

**Result:** No more User auth, profile, favourites, payments, event dashboard, filter, or guest list routes. No code under `User/` remains.

---

## Phase 2: Admin Panel – Remove User Role

**Goal:** Admin can no longer create, list, or filter “user” accounts; only host and artist.

### 2.1 Get all app users (`Admin/controllers/getAllUsers/allUsers.js`)

- Remove: `const User = require("../../../User/models/Auth/Auth")` and `const UserProfile = require("../../../User/models/Profile/UserProfile")`
- Remove from `Promise.all`: `User.find()...` (and any use of `users`)
- Remove: fetching `userProfiles`, building `userAddressMap`, and merging address into users
- Build `allUsers` only from **hosts** and **artists** (with artist profile location if applicable)
- Adjust response so it only returns hosts and artists (e.g. rename or document that “users” here means “all app accounts”, not the User role)

### 2.2 Create user (`Admin/controllers/createUser/createUser.js`)

- Remove from `roleModelMap`: `user: User`
- Remove: `const User = require("../../../User/models/Auth/Auth")`
- Update validation/error message: allow only `host` and `artist` (e.g. “Use one of: host, artist”)

### 2.3 Filter users (`Admin/controllers/FilterUsers/filterUsers.js`)

- Remove: `const User = require("../../../User/models/Auth/Auth")`
- Remove the `role === "user"` branch (no longer query User collection)
- When `role` is provided: only handle `host` and `artist`
- When no role: only query Host and Artist collections (remove User.find())
- Update error message: “Use 'host' or 'artist'” (remove “user”)

**Result:** Admin panel no longer manages User accounts; only Host and Artist.

---

## Phase 3: Shared Features That Depend on User

**Goal:** Remove or adjust modules that are only for Users or that reference the User role/models.

### 3.1 Event Host Ticket Booking (User-facing)

Ticket booking is done by **Users** (attendees). Removing User means removing the user-facing ticket flow.

**Files:**

- `eventHostBooking/routes/ticketBookingRoutes.js`
  - Routes: `POST /book`, `GET /user-tickets`, `POST /create-order` (all use `authMiddleware(['user'])`)
  - **Option A:** Remove the entire `ticketBookingRoutes.js` and do not mount it in `server.js` (no one can book tickets anymore).
  - **Option B:** Keep file and routes for a future “guest” or other role; for this phase, simply remove the route file from `server.js` so no User can call these APIs.

- `server.js`
  - Remove: `const eventHostTicketBookingRoutes = require('./eventHostBooking/routes/ticketBookingRoutes')`
  - Remove: `app.use('/api/eventhost/tickets', eventHostTicketBookingRoutes)`

**Note:**  
- `eventHostBooking/model/ticketBooking.js` has `ref: 'UserAuthentication'`. If you later introduce another “booker” type, you can change this ref or add a discriminator; for Phase 3, leaving the model as-is is fine if no one can create ticket bookings.  
- `eventHostBooking/routes/adminRoutes.js` and admin invoice logic (for host/admin) can stay; only the **user** ticket booking routes are removed.

### 3.2 Event Host Admin Invoices (User-facing route)

- `eventHostBooking/routes/adminRoutes.js`
  - `GET /getInvoices` currently uses `authMiddleware(['user'])` (users viewing their invoices).
  - Remove this route, or replace with a different auth (e.g. host-only) if hosts should see something else. For “remove User” scope: **remove the GET /getInvoices route** (or the whole router usage for that path).

### 3.3 Guest List (User-specific actions)

Guest list has **User** actions: apply for guest list, get discount level. Rest is Host/Artist.

- `guestList/routes/guestListRoutes.js`
  - Remove or comment out:
    - `POST /apply/:eventId` (authMiddleware(['user']))
    - `GET /events/:eventId/discount` (authMiddleware(['user']))
  - Keep Host/Artist routes (enable, link, approve, reject, pending, all for artist/host) if you still want guest list for non-User flows; otherwise remove entire guest list module from `server.js`.

- `guestList/controller/guestListController.js`
  - Remove or guard any logic that assumes `senderType: 'user'` / `recipientType: 'user'` so no code path creates or reads User-specific guest list data. Adjust notifications accordingly.

**Result:** No User can apply for guest list or get user discount; optional: remove entire guest list if not needed without Users.

### 3.4 Delete Account (User role)

- `DeleteAccount/deleteAccountRoute.js`
  - Validation: change `body('role').notEmpty().isIn(['user', 'artist', 'host'])` to `isIn(['artist', 'host'])`.

- `DeleteAccount/deleteAccountController.js`
  - Remove: `const UserAuth = require('../User/models/Auth/Auth')` and `const UserProfile = require('../User/models/Profile/UserProfile')`
  - Remove the `case 'user':` block from the role switch (and `cascadeDeleteUser`, `profileIdField = 'userId'`, etc.)
  - Keep only `artist` and `host` cases.

- `utils/deleteAccountService.js`
  - Remove: `cascadeDeleteUser` function and all references to User models (`GuestList`, `FavouriteEvent`, `UserPaymentDetails`, etc., that are only for User cascade)
  - Remove from exports: `cascadeDeleteUser`
  - Keep: `cascadeDeleteHost`, `cascadeDeleteArtist`

**Result:** Delete-account API no longer accepts or handles the User role.

---

## Phase 4: Host & Artist Panels – Remove User Usage

**Goal:** Remove endpoints and middlewares that exist only for Users or that allow User access.

### 4.1 Host Events

- `Host/controllers/Events/event.js`
  - Remove the function `getAllEventsForUsers` (used by User panel to browse events).

- `Host/Routes/Event.js`
  - Remove import and use of `getAllEventsForUsers`
  - Remove route: `router.get("/get-all-events", getAllEventsForUsers)` (or equivalent)
  - Replace any other route that used `getAllEventsForUsers` with a 404 or remove it
  - Update middlewares that included `"user"`:
    - e.g. `authMiddleware(["host", "artist", "user"])` → `authMiddleware(["host", "artist"])`
    - Remove or reassign routes that were `authMiddleware(["user"])` only (e.g. `getLatestEvents`) – either remove the route or restrict to host/artist if that makes sense

**Result:** No Host route is only for Users; no “get all events for users” endpoint.

### 4.2 Artist Filter & Rating

- `Artist/Routes/filter.js`
  - Change `authMiddleware(["artist", "user", "admin"])` to `authMiddleware(["artist", "admin"])` (remove `"user"`).

- `Artist/Routes/Rating.js`
  - Change `authMiddleware(["artist","user"])` to `authMiddleware(["artist"])` (remove `"user"`).

- `Artist/controllers/Rating/rating.js`
  - Remove or adjust logic that uses `req.user.userId` or `req.user.role === "user"` (only artist path should remain).

**Result:** Artist filter and rating are no longer callable by User role.

---

## Phase 5: Notifications & Global “User” References

**Goal:** No enum or route allows the User role; notifications and FCM stay for host/artist only.

### 5.1 Notification routes

- `Notification/routes/notificationRoutes.js`
  - Replace every `authMiddleware(['host', 'artist', 'user'])` with `authMiddleware(['host', 'artist'])`.

### 5.2 Notification and FCM models

- `Notification/model/notification.js`
  - In any enum that includes `'user'` (e.g. `['host', 'artist', 'user']` or `['host', 'artist', 'user', 'system']`), remove `'user'` so only `host`, `artist`, and optionally `system` remain.

- `Notification/model/fcmToken.js`
  - In enum for role/userType (e.g. `['host', 'artist', 'user']`), remove `'user'`.

**Result:** Notifications and FCM tokens are only for host and artist (and system if present).

---

## Phase 6: Documentation & Optional Cleanup

**Goal:** Docs and diagrams reflect “no User role”.

### 6.1 Data flow / architecture doc

- `DATA_FLOW_DIAGRAM.md`
  - Remove all User flows: User signup/login, User profile, User event dashboard, User ticket booking, User favourite events, User guest list, User payment details.
  - Remove User from “Key User Interactions” and “User Journey.”
  - Update “API Endpoint Summary”: remove every `/api/user/*` and any endpoint described as “User only.”
  - Update DB collections list: remove UserAuthentication, UserProfile, and any User-only collections (e.g. FavouriteEvent, UserPaymentDetails, GuestList if fully removed).
  - Update Mermaid diagrams: remove User participant and User-only paths.

### 6.2 Optional

- **authMiddleware:** No change required; just no route will pass `allowedRoles` including `'user'`.
- **Socket.IO:** No change required unless you had logic that treated “user” differently; remove that if present.
- **README or API docs:** If they mention User role or `/api/user/*`, update or remove those sections.

---

## Checklist Overview

| Phase | Area | Main actions |
|-------|------|--------------|
| 1 | User panel | Remove User routes from server; delete `User/` module |
| 2 | Admin | allUsers: only host+artist; createUser & filterUsers: drop “user” role |
| 3 | Shared | Ticket booking routes (user); guest list user routes; delete-account user case; deleteAccountService cascadeDeleteUser |
| 4 | Host/Artist | Host: remove getAllEventsForUsers and user-only routes; Artist: remove “user” from filter & rating |
| 5 | Notifications | Routes and models: remove “user” from allowed roles and enums |
| 6 | Docs | DATA_FLOW_DIAGRAM and any README/API docs: remove User flows and endpoints |

---

## Execution Order

Execute in order **1 → 2 → 3 → 4 → 5 → 6** so that:

1. No code under `User/` is referenced (Phase 1) before other phases remove those references (Phases 2, 3).
2. Delete-account and cascade delete (Phase 3) no longer depend on User models.
3. Host/Artist and Notifications (Phases 4–5) no longer allow User in auth or enums.
4. Documentation (Phase 6) is updated last so it matches the final behaviour.

After all phases, the backend has **no User role** and **no User-related features** in any panel (Admin, Artist, Host) or in shared modules.
