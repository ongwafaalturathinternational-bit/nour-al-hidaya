# Nour Al-Hidaya staff assignment integration contract

Status: internal staging handlers and isolated tests implemented; no route wiring, account provisioning, access grant, or deployment is enabled. The contract remains subject to WAT scope and data-model review.

## 1. Purpose and separation of responsibilities

The institutional staff-account lifecycle remains owned by PR #21. Nour Al-Hidaya (NH) teaching assignments are a separate authorization layer owned by the learning API.

- `staffAccess/{uid}` remains the institutional account and WAT-wide access record.
- `learningStaffAssignments/{uid}` is the NH-specific assignment registry.
- A Firebase UID is the stable join key. Do not duplicate passwords, tokens, or account credentials.
- Creating or activating a WAT staff account MUST NOT create an NH assignment.
- Changing a WAT role or general scopes MUST NOT silently change NH assignments.
- Revoking an NH assignment MUST NOT deactivate the WAT account.
- Suspending a WAT account MUST immediately block all NH access, even when an NH assignment remains marked active.

An NH request is authorized only when all checks pass: valid authenticated Firebase identity; verified email; Firebase account not disabled; current `staffAccess.active === true`; required institutional scope present; at least one active, in-date NH assignment grants the exact NH scope; and the requested resource falls within that assignment's explicit perimeter.

## 2. Internal mutation handlers (not exposed)

The Worker module `workers/learning-api/src/learning-assignment-service.js` implements grant, update, and revoke as internal handlers. They are not registered in the HTTP router or exposed as Firebase callable functions. Before any future route wiring, require explicit review, Firebase App Check where applicable, and current-admin revalidation. Direct Firestore client writes remain forbidden.

Each successful mutation commits the assignment registry, a deterministic request receipt, and an append-only audit event in one Firestore `documents:commit` request. Assignment writes compare the previously read `updateTime` (or require absence); receipt and audit creation require absence. Competing writes fail atomically. Replaying the same actor and `requestId` returns the stored result without adding another audit event; reusing the ID with different content conflicts.

The grantable scope catalogue is an explicit allowlist in the internal service. `learning.staffAssignments.manage` must be present in the caller's active WAT staff record and is deliberately excluded from grants. The account-management policy still needs WAT review before anyone receives this scope.

### createLearningStaffAssignment

Input:
```json
{
  "uid": "target-firebase-uid",
  "assignment": {
    "scopeGrants": ["learning.groups.read"],
    "structureIds": ["structure-id"],
    "siteIds": ["site-id"],
    "groupIds": ["group-id"],
    "programIds": ["program-id"],
    "validFrom": "2026-12-01T00:00:00.000Z",
    "validUntil": null
  },
  "requestId": "client-generated-unique-id",
  "reason": "Institutional justification"
}
```
Server-generated fields: immutable `assignmentId`, `active: true`, `createdAt`, `createdBy`, `updatedAt`, `updatedBy`, and `version: 1`.

Preconditions: caller is authorized to administer NH assignments; target Auth user exists, is not disabled, has verified email; target `staffAccess` exists and is active; all requested NH scopes are recognized and permitted; all perimeter IDs exist and are internally consistent; validity dates are valid. An empty perimeter is invalid and never means global access.

### updateLearningStaffAssignment

Input:
```json
{
  "uid": "target-firebase-uid",
  "assignmentId": "existing-assignment-id",
  "expectedVersion": 1,
  "patch": {
    "scopeGrants": ["learning.groups.read", "learning.groups.manage"],
    "groupIds": ["group-id-2"]
  },
  "requestId": "client-generated-unique-id",
  "reason": "Updated responsibility"
}
```
Only an explicit allowlist of mutable fields may be patched. `uid`, `assignmentId`, creator fields and creation timestamp are immutable. The server validates the complete resulting assignment, increments `version`, and rejects stale `expectedVersion` values with a conflict response.

### revokeLearningStaffAssignment

Input:
```json
{
  "uid": "target-firebase-uid",
  "assignmentId": "existing-assignment-id",
  "expectedVersion": 2,
  "requestId": "client-generated-unique-id",
  "reason": "End of assignment"
}
```
Revocation is a soft revocation: set `active: false` and record `revokedAt`, `revokedBy`, and `revocationReason`. Preserve the assignment and its history. Repeated identical requests with the same `requestId` are idempotent.

## 3. Registry document

Collection: `learningStaffAssignments`; document ID: Firebase UID.

```json
{
  "schemaVersion": 1,
  "version": 3,
  "active": true,
  "assignments": [
    {
      "assignmentId": "server-generated-id",
      "active": true,
      "scopeGrants": ["learning.groups.read"],
      "structureIds": ["structure-id"],
      "siteIds": ["site-id"],
      "groupIds": ["group-id"],
      "programIds": ["program-id"],
      "validFrom": "2026-12-01T00:00:00.000Z",
      "validUntil": null,
      "version": 1,
      "createdAt": "server timestamp",
      "createdBy": "admin-uid",
      "updatedAt": "server timestamp",
      "updatedBy": "admin-uid"
    }
  ],
  "updatedAt": "server timestamp",
  "updatedBy": "admin-uid"
}
```

The record-level `active` flag is a registry kill switch, not a substitute for checking each assignment. A user may have multiple assignments with different scopes and perimeters. Authorization must evaluate the requested scope and resource against one qualifying assignment; scopes from one assignment must not be combined with the perimeter of another.

## 4. Scope model and compatibility with PR #21

PR #21 currently has a general `ALLOWED_SCOPES` allowlist but no `learning.*` scopes. Do not send NH scopes to the current account functions: they will be rejected.

Before implementation, define a reviewed NH scope catalogue in the learning domain (for example `learning.structures.read`, `learning.sites.read`, `learning.groups.read`, `learning.groups.manage`, `learning.beneficiaries.read`). Add the corresponding institutional allowlist entries only after the scope catalogue and delegation policy are approved.

The effective permission is the intersection of:
1. active WAT account;
2. institutional scope on `staffAccess`;
3. active NH assignment grant;
4. explicit assignment perimeter;
5. resource-level privacy policy.

A role label alone never grants an NH permission. No implicit inheritance from `president`, `responsable_programme`, `formateur`, or another role.

## 5. Atomic persistence and audit

Each grant, update, and revoke must be committed in one Firestore transaction with its audit event. If the audit write cannot be committed, the assignment mutation must roll back.

Use append-only events:
- `assignment.grant`
- `assignment.update`
- `assignment.revoke`
- `assignment.expire` (only if an explicit expiry process is later implemented)

Each event records actor UID, target staff UID, assignment ID, event type, timestamp, request ID, reason, and a minimal before/after authorization diff. Never include beneficiary records, private learner details, credentials, or tokens in assignment audit events.

Use a stable audit document key derived from the idempotency request ID (or a dedicated idempotency registry) so a retry cannot create duplicate grants or duplicate audit events. Audit records are append-only: clients and ordinary server paths cannot update or delete them.

## 6. Runtime authorization rules

- Re-read current staff status and assignment state for protected operations; do not trust cached role claims as the sole source of truth.
- Check Firebase disabled status or a reliable revocation mechanism in addition to `staffAccess.active`.
- Enforce `validFrom` and `validUntil` on every request. Expiry must deny access even if no scheduled cleanup has run.
- Missing, malformed, or empty perimeter data denies access.
- Require the resource to carry complete perimeter dimensions; incomplete resource metadata denies access.
- An active account with no NH assignment is denied NH access.
- An active assignment attached to a suspended or disabled WAT account is denied.
- Revoking one assignment blocks only that assignment; other valid assignments remain eligible.
- Reactivating a WAT account does not reactivate revoked or expired assignments.
- Direct client writes to `learningStaffAssignments` and NH audit collections remain denied by Firestore rules.

## 7. Required functional tests

Use Firebase Emulator tests for callable behavior and Firestore rules, not only source-text/regex assertions.

1. Authorized administrator creates a valid assignment.
2. Reject unauthenticated caller, missing App Check, unverified caller, and unauthorized administrator.
3. Reject nonexistent, disabled, unverified, or inactive target account.
4. Reject unknown or institutionally ungranted NH scopes.
5. Reject missing, empty, unknown, inconsistent, or overbroad perimeter dimensions.
6. Deny an active WAT account with no NH assignment.
7. Deny an NH assignment when WAT account is suspended or Firebase Auth user is disabled.
8. Deny before `validFrom` and at/after `validUntil`.
9. Deny scope mismatch and every out-of-perimeter resource.
10. Prove scopes from separate assignments cannot be combined to authorize one request.
11. Update with current version succeeds; stale version and concurrent conflicting update fail safely.
12. Revoke immediately blocks that assignment; other assignments remain unaffected.
13. Repeated request ID is idempotent and creates no duplicate audit event.
14. Inject audit persistence failure and prove the assignment write rolls back.
15. Direct client create/update/delete of assignment and audit documents is denied.
16. Revocation preserves history; hard deletion is not an exposed operation.
17. Private beneficiary fields require a separate, explicit privacy scope and remain denied by default.

Keep the existing static tests as guardrails, but do not treat them as proof of runtime security.

## 8. Integration sequence

1. Approve the NH scope catalogue and institutional delegation policy.
2. Add the separate assignment service and emulator tests in staging.
3. Wire authorization middleware into NH routes while routes remain closed.
4. Add a read-only assignment summary to the staff administration view only after the server contract is stable.
5. Verify WAT suspension, Auth disablement, revocation, expiry, audit atomicity, and perimeter denial in staging.
6. Conduct a security review before any route opening or real staff provisioning.

## 9. Decisions still required from WAT

These are policy decisions, not technical defaults:
- Which institutional authority may grant national or multi-structure assignments?
- May the President grant every NH scope directly, or is a second approval required for sensitive scopes?
- Which roles may supervise several mosques/sites?
- Which exact roles may access identifiable beneficiary records, especially records concerning minors?
- What is the default assignment duration, and who may renew it?

Until these decisions are recorded, keep the implementation in staging, do not add live `learning.*` grants, do not provision real assignments, and keep NH API routes closed.
