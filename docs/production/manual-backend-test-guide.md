# Manual Backend Test Guide

Follow this sequence verbatim to ensure Fuwu operates reliably in production:

1. **Login Page Opens**: Navigate to `/login`. Ensure it renders without errors.
2. **Email Magic Link**: Enter a valid email address. Verify the success toast appears without dumping technical SQL exceptions.
3. **Provider Application Submit**: Open `/provider-application`. Submit an application. Verify the successful redirect message.
4. **Admin Sees Application**: Log in via an admin account. Navigate to `/admin/provider-applications`. Verify the submitted data appears with `status: pending`.
5. **Admin Approves Provider**: Click `Approve`. Verify exactly one record generates in the `providers` table without throwing `invalid input syntax`.
6. **Provider Appears Publicly**: Navigate to `/providers`. Verify the newly approved provider accurately renders in the DOM without horizontal overflow on mobile devices.
7. **Request Submit**: Navigate to `/request` as a logged-in user. Fill the fields and submit. Check for a clean success message.
8. **Admin Sees Request**: Open `/admin/service-requests`. Ensure the new request appears as `yeni`.
9. **Admin Assigns Provider**: Mutate the request status and assign the approved provider (linking `assigned_provider_id`).
10. **Communication Check**: Inside `/providers`, attempt to click the WhatsApp or Telefon links ensuring they are formatted correctly (i.e., `+905551234567`).
