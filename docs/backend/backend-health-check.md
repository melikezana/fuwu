# Backend Health Check Guide

## Overview
Fuwu provides a safe, backend-diagnostic script located at `src/services/health/backendHealth.ts`. This diagnostic script verifies the core connectivity requirements without exposing sensitive data to the client or modifying any tables.

## What is Monitored?

The script verifies:
1. **Environment Variables**: Confirms `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are actively injected.
2. **Auth Client**: Ensures the Supabase server client successfully initializes without throwing constructor errors.
3. **Database Read Connectivity**:
   - `service_categories`
   - `districts`
   - `providers` (Checks for `is_active = true` and `is_approved = true`)

## How to use

Developers or Admin routes can import `checkBackendHealth()`:

```ts
import { checkBackendHealth } from "@/services/health/backendHealth";

const healthStatus = await checkBackendHealth();

if (healthStatus.status !== "healthy") {
  console.warn("Backend degraded:", healthStatus.errors);
}
```

## Status Results
- `healthy`: All environment keys exist, Auth initializes, and database tables are readable.
- `degraded`: Client initializes but specific tables are failing to return rows (might indicate empty tables or RLS misconfiguration).
- `unhealthy`: Missing environment keys or critical client initialization failure.
