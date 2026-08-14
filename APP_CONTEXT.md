# Voltava Drive - Super Admin Dashboard Context

## 🎯 Ultimate Goal of the App (App ka Last Goal Kya Hai?)
The final goal of this application is to serve as the **Super Admin Dashboard for Voltava Energy Systems**. It is a centralized control panel designed for Voltava's internal team to manage and monitor their entire EV and fleet intelligence ecosystem:
- **Schools / Clients**: Onboarding and managing schools that use the fleet.
- **Hardware / Devices**: Tracking GPS devices, Smart BMS (Battery Management Systems), and managing which device is assigned to which vehicle.
- **Admins**: Managing user access for School Admins and other Super Admins.
- **Real-Time Tracking & Analytics**: Monitoring the live location of the fleet on a map, receiving SOS/Emergency alerts, and analyzing fleet health (e.g., how many buses are online, offline, or overspeeding).

## 🏗️ How the App is Working (Architecture)
1. **Frontend**: Built with React, Vite, and Tailwind CSS for a modern, responsive UI.
2. **Middleman Server (Express)**: The `server.ts` file runs an Express Node.js server. Its job is to serve the React frontend and **proxy** (forward) API requests from the frontend to your actual backend server (`https://gps-backend-jzd7.onrender.com`).
3. **Authentication**: The app uses JWT tokens. When a user logs in, the backend provides a token which is saved in `localStorage` and sent with every subsequent API request inside the `Authorization: Bearer <token>` header.

---

## 📊 Data Breakdown: Kitna Data Real Hai vs. Kitna Mock Hai?

Currently, the app is integrated with the real backend for almost everything. However, a few specific features are "mocked" (fake data) directly inside the `server.ts` file because those APIs are not yet ready on the backend.

### 🟢 REAL DATA (Coming directly from the Backend API)
These features are fully connected to `https://gps-backend-jzd7.onrender.com`:
- **Auth/Login**: `POST /api/auth/login` (Real email/password validation and token generation).
- **Dashboard Stats**: `GET /api/admin/stats` (Total schools, buses, active devices, etc.).
- **Map & Locations**: `GET /api/devices/locations` and WebSocket connections (`/socket.io`) for live tracking.
- **Hardware/Devices**: `GET`, `POST`, `PUT`, `DELETE` for `/api/devices`.
- **Schools Directory**: `GET`, `POST` for `/api/schools`.
- **Admins Directory**: `GET`, `POST`, `PUT`, `DELETE` for `/api/admins`.
- **Logs**: `GET /api/admin/logs`.

### 🟡 MOCK DATA (Fake data handled locally in `server.ts`)
We created temporary mock endpoints inside the `server.ts` file so the frontend UI can be completed while we wait for the backend team to build these endpoints:
1. **Global Search (`GET /api/search`)**: Currently returns a fake static list of schools, devices, and admins when you type in the top search bar.
2. **Notifications (`GET /api/notifications`)**: Currently returns a fake "High Speed Alert" system warning so we can design the notification dropdown UI.
3. **Resolve Notifications (`POST /api/notifications/:id/resolve`)**: Returns a fake success response when you dismiss a notification.

---

## 🚧 What We Need From the Backend Team (Next Steps)

Here is exactly what the backend team needs to fix or implement so the frontend can be 100% real:

1. **Fix the 500 Error on Edit School (`PUT /api/schools/:id`)**:
   - **Issue**: Right now, when we try to edit and save a school's details, the backend returns a `500 Internal Server Error`.
   - **What we did**: We added an error message on the frontend UI that says *"Failed to update profile on the server (500 Error). Please inform the backend team."*
   - **Backend Task**: Check the backend logs to see why `PUT /api/schools/<id>` is crashing and fix it.

2. **Build the Search API**:
   - **Backend Task**: Create the `GET /api/search?q=query` endpoint that searches across schools, devices, and admins simultaneously and returns a combined JSON response. (Once this is done, we will remove the mock from `server.ts`).

3. **Build the Notifications API**:
   - **Backend Task**: Create `GET /api/notifications` to fetch recent SOS alerts and system warnings, and `POST /api/notifications/:id/resolve` to mark them as read/resolved. (Once this is done, we will remove the mock from `server.ts`).
