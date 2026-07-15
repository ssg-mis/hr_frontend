# Walkthrough - Attendance Module & Shift Assignment

I have fully implemented the attendance tracking and employee shift management system, adjusted specifically for the HR and Higher Management point of view.

## Changes Made

### 1. Database Schema
Created the following tables in the database via Drizzle ORM inside `hr_backend/src/modules/attendance/attendance.schema.ts`:
- **`attendance_sessions`**: Tracks daily employee work dates, status (`Present`, `Absent`, `leave`), and total calculated work minutes.
- **`attendance_events`**: Tracks check-in, check-out, break start, and break end event timestamps.
- **`employee_shifts`**: Tracks shifts (A, B, C, D) assigned to employees along with the start and optional end dates.
- Pushed and migrated the database successfully using `drizzle-kit push`.

### 2. Backend Routes and Controller
Created routes and controller actions inside `hr_backend/src/modules/attendance/attendance.controller.ts` & `attendance.routes.ts`:
- `POST /api/v1/attendance/events`: Records employee attendance events and recalculates session `workMinutes` automatically based on check-in/out and breaks. It supports custom `eventTime` allowing HR to backdate or log events in the past.
- `GET /api/v1/attendance/sessions/today`: Fetches the current day's active session and timeline of events for an employee.
- `GET /api/v1/attendance/sessions`: Admin view fetching everyone's daily record (automatically overlaying approved leaves and absent records).
- `POST /api/v1/attendance/shifts`: Handles new shift assignments, automatically updating previous shifts to prevent overlapping.
- `GET /api/v1/attendance/shifts`: Fetches active/historical shifts of employees.
- Registered endpoints in `hr_backend/src/app.ts`.

### 3. Frontend Pages & Navigation (HR & Management POV)
Integrated the module into the React frontend app:
- Updated `hr_frontend/src/components/Sidebar.jsx` with an **Attendance Module** dropdown containing links to:
  - **Attendance Dashboard**: Admin panel to monitor all employee records.
  - **Shift Management**: Admin panel to assign shifts (A, B, C, D) to employees.
  (Self-punching console "My Attendance" has been removed to match the HR/Management point of view.)
- Added paths and imports in `hr_frontend/src/App.jsx` to render:
  - `pages/AttendanceDashboard.jsx` (which now features a **Log Event** action where HR can check in, check out, or log break transitions for any employee with date & time customizations).
  - `pages/ShiftManagement.jsx` (which allows assigning A, B, C, D shifts to employees).

## Verification

### Automated Checks
- Backend typechecking completed successfully via `tsc --noEmit`.
- Frontend code compiled and bundled successfully via `vite build`.

### Manual Verification
To verify the feature locally:
1. Start the backend (`npm run dev` in `hr_backend`).
2. Start the frontend (`npm run dev` in `hr_frontend`).
3. Log in, expand the "Attendance Module" dropdown on the sidebar.
4. Go to **Attendance Dashboard** to confirm employees' records, absent states, and leaf logs are calculated and displayed correctly for any date.
5. In the dashboard table, click **Log Event** next to any employee to punch in, punch out, or adjust break events for them (with configurable date & time).
6. Verify their status changes and work minutes are computed automatically.
7. Click **Logs** on that employee to check their event timeline.
8. Navigate to **Shift Management** to assign a shift (A, B, C, or D) to employees and verify it shows up in the shift records list.
