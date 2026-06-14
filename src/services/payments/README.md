# Fuwu Payments MVP

This service tracks payment preference and manual payment confirmation only.

Planned online integration outline:

- Prefer Iyzico for Turkey-first card payments.
- Add a checkout creation action after a service request is accepted or completed.
- Add `/api/payments/webhook` to verify provider signatures and update `payments.status`.
- Store external provider IDs on `payments` after extending the table.
- Keep manual admin confirmation as a fallback for cash, IBAN, and POS payments.
