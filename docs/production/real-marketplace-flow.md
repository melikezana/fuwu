# Real Marketplace Flow

This document details the end-to-end integration and operations of the Fuwu Marketplace.

## 1. Customer Request Lifecycle
Customers can create new service requests at `/request`. The process is as follows:
1. User selects `Category` and `District` along with their contact info.
2. The form validates all required fields before submission.
3. The request is submitted to Supabase using `requestService.createRequest`, assigning the initial status `yeni` (New).
4. If successful, the user sees a friendly success alert and a button to return to the homepage. If it fails, a Turkish error message is displayed (no raw DB errors).

## 2. Admin Request Management
Admins can view and manage all customer requests at `/admin/requests`:
- It fetches data via `adminService.getAllRequests()`.
- The interface is a mobile-responsive table.
- Admins can change the status using a dropdown (`yeni`, `inceleniyor`, `ustaya_yonlendirildi`, `tamamlandi`, `iptal`). The state updates immediately on success.

## 3. Provider Application Lifecycle
Professionals can apply to join the network at `/provider/apply`.
1. The application form collects essential details (Name, Phone, WhatsApp, Category, District, Price Range).
2. Submitted applications get the status `pending` (Bekleyen).
3. At `/admin/providers`, admins review pending applications and can click "Onayla" (Approve) or "Reddet" (Reject).
4. Only providers with an `approved` status will be visible on the public listings.

## 4. Provider Matching Logic
The public provider listing (`/providers`) uses the smart matching engine `matchingService.matchProviders(category, district)`:
- It exclusively queries for providers with `status="approved"` and non-offline availability.
- The results are sorted dynamically: Providers with `müsait` (Available) status are prioritized, followed by `yoğun` (Busy), and then sorted by highest rating.

## 5. WhatsApp Lead Generation
The `ProviderCard` handles direct leads via WhatsApp. We utilize `whatsappHelper.generateLeadUrl(phone, category, district)` to auto-generate a context-aware message, e.g.:
> *"Merhaba, Fuwu üzerinden ulaşıyorum. Kadıköy için Tesisat hizmeti almak istiyorum."*
This creates an immediate, professional, and clear intro for the provider.

## 6. Auth/Role Preparation
Currently, the admin dashboard fetches data using generic API calls for demonstration purposes. In a fully authenticated production setup, the `/admin/*` routes should be protected by a Next.js middleware (e.g. `middleware.ts`) that checks the Supabase session token and verifies the user's role in the `profiles` table.

## 7. Future Improvements
- **Pagination:** Implement Supabase cursor pagination on the admin pages for scalability.
- **Provider Dashboard:** Create a private `/provider/dashboard` for professionals to edit their profile and manage their availability on their own.
- **Advanced Matchmaking:** Implement distance-based matching using PostGIS in Supabase.
