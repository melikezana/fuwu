# Admin Operations Dashboard Architecture

This document describes the design and components backing the Fuwu Production Admin Operations Dashboard (`/admin`). The goal of this architecture is to provide real-time, reliable marketplace analytics directly to operations managers securely through the backend.

## 1. Dashboard Metrics (`getAdminOverviewMetrics`)
The dashboard aggregates operational vitality metrics using exact match COUNT queries on Supabase:
- **Toplam Talep**: Total distinct customer service requests created.
- **Bekleyen Talep**: Requests remaining in the unreviewed `yeni` status.
- **İncelenen Talep**: Requests manually moved to `inceleniyor`.
- **Ustaya Yönlendirildi**: Requests actively assigned via `assigned_provider_id` to a provider.
- **Tamamlanan / İptal**: Terminated requests.
- **Aktif Usta**: Providers fully approved and active in the marketplace.
- **Onay Bekleyen Usta**: Provider applications sitting in the `pending` queue.

## 2. Granular Analytics
Detailed analytics strictly iterate over lightweight queries, avoiding N+1 lookup errors:
- **`getRequestAnalytics()`**: Parses all requests to tally counts by `status`, `category`, and `district`. Returns mapped aggregation objects for simple rendering.
- **`getProviderAnalytics()`**: Distinguishes active/inactive states across `providers`, compiling geographical and operational density by `category` and `district`.

## 3. Assignment Monitoring
The `getAssignmentMonitoring()` routine explicitly tracks only requests with an active `assigned_provider_id`. 
It performs nested JOINs dynamically returning:
- Assigned Provider Name
- Customer Phone (visible exclusively to Admin for QA checks)
- Target District & Category
- Request Status
- Created Timestamp

This allows operations teams to rapidly spot "stuck" assignments.

## 4. Audit Log Handling
An explicit tracking block queries the `audit_logs` table (introduced in Task 109). It fetches the latest 10 transactional events (`admin.action`, `service_request.assigned`, etc.).
**Safety Fallback**: The query utilizes `maybeSingle()` / strict catch-blocks. If the schema is dropped or missing, it defaults to a clean `EmptyAdminState` message instead of crashing the dashboard UI.

## 5. UI Philosophy
All components are modular and exported from `src/components/admin`:
- **`AdminSection`**: Standardizes margins and wraps content in `overflow-x-auto` to strictly prevent mobile viewport horizontal stretching.
- **`MetricCard`**: A flexible widget highlighting big numeric trends.
- **`StatusBadge`**: Uniform semantic color-coding for status flags.
- **`EmptyAdminState`**: Consistent dashed borders for missing data flows.

## 6. Future Improvements
- **Date Range Filters**: Currently, metrics pull lifetime data. Passing `date_from` and `date_to` parameters into `operations.ts` can unlock monthly/weekly trends.
- **Time-to-Match KPI**: Calculate average delta between `created_at` and `assigned_timestamp`.
