# Admin account setup

Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in the backend environment before startup. The backend creates one administrator account using those values; use a unique email and a strong password of at least eight characters. Do not commit these credentials.

If `ADMIN_EMAIL` already belongs to a non-admin account, `ADMIN_PASSWORD` must match that account's existing password before the backend promotes it. Existing admin accounts are not reset on subsequent startups.

Public registration only accepts `PLAYER` or a request for `ORGANIZER`. Organizer requests remain player accounts until an admin approves them. A referee is not a global signup role: an organizer appoints an existing player to a specific tournament, and that player must accept the invitation before managing its matches.

Admins can manage accounts, create another admin, review organizer requests, approve or reject new tournaments, and manually update player levels with an audit reason. Admins do not create or run organizer-owned tournaments and cannot control match scores. New tournaments are hidden from public lists and cannot accept invitations until approved; rejected tournaments can be edited by their organizer and resubmitted.

Organizers own their tournaments, manage invitations and approvals, and record practice sessions for approved players in their approved tournaments. Practice results store attempts and successful attempts per skill; the app computes success rates for player training history. Player levels are not changed automatically from match outcomes or practice statistics.

Referee accounts are intentionally not created globally: organizers appoint an existing player to a tournament, and that player must accept the invitation before controlling its matches. When an account is deleted, its tournament memberships are removed and tournaments owned by it are transferred to the deleting admin.

Tournament cover images are stored under `uploads/tournaments` and served from `/uploads/tournaments`. Keep this directory on persistent storage when deploying the backend; otherwise uploaded covers will be lost when the instance is replaced.
