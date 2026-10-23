# Security Specification: Monitoring Tagihan Vendor Aksesoris Astra Isuzu

## 1. System Invariants & RBAC Architecture
- **Roles**:
  - `owner` (Master System Astra Isuzu): Super-admin access. Can upload Good Receipts master data, approve/reject user accounts, approve invoices to "Pembayaran Dijadwalkan", and view cross-vendor analytics. Bootstrapped email: `fajrisani12@gmail.com`.
  - `admin` (Vendor Admin): Restricted to single vendor ("PT. Jaya Kreasi Indonesia" or "PT. Terang Part Indonesia"). Cannot upload Good Receipts. Can only view and bill Good Receipts for their own vendor. Can create invoices with initial status "Open".
- **Approval Gating**:
  - Newly registered users have `status == "Pending"`. They must be approved (`status == "Approved"`) by an Owner before accessing operational vendor data.

## 2. Invariants per Collection
### Users (`/users/{userId}`)
- User ID in path must equal `request.auth.uid` during initial registration.
- Initial registration status cannot self-elevate to "Approved" unless matches predefined master owner email.
- Non-owners cannot elevate their own role or status.
- Only owners can update `status` and `role` of other users.

### Good Receipts (`/goodReceipts/{grId}`)
- Only owners can create or delete Good Receipts (master upload).
- Vendor Admins can only `read` (get/list) Good Receipts where `resource.data.vendor == userVendor`.
- Vendor Admins can only update status from `Outstanding` to `Invoiced` when generating an invoice for their vendor.

### Invoices (`/invoices/{invoiceId}`)
- Created by approved Vendor Admin with status `Open`.
- `incoming().vendor` must match the vendor admin's registered vendor.
- `incoming().totalAmount` must be > 0.
- Only owners can transition status to `Pembayaran Dijadwalkan` or `Ditolak`.

## 3. The Dirty Dozen Payloads (Negative Tests)
1. Vendor A Admin tries to list Good Receipts belonging to Vendor B -> PERMISSION_DENIED.
2. Vendor A Admin tries to create an invoice for Vendor B -> PERMISSION_DENIED.
3. Vendor A Admin tries to directly upload new Good Receipts -> PERMISSION_DENIED.
4. Pending user tries to access Good Receipts or Invoices before approval -> PERMISSION_DENIED.
5. Vendor Admin tries to self-approve their invoice to "Pembayaran Dijadwalkan" -> PERMISSION_DENIED.
6. Vendor Admin tries to modify totalAmount of an existing invoice -> PERMISSION_DENIED.
7. Unauthenticated user attempts any read or write -> PERMISSION_DENIED.
8. User attempts to update another user's role to "owner" -> PERMISSION_DENIED.
9. Malicious payload injecting arbitrary ghost fields into GoodReceipt -> PERMISSION_DENIED.
10. Attempting to invoice a Good Receipt already marked "Invoiced" -> PERMISSION_DENIED.
11. User trying to tamper with `createdByUid` on invoice creation -> PERMISSION_DENIED.
12. Attempt to create user with fake email spoofing -> PERMISSION_DENIED.
