# Cookr Beta Operations Toolkit

Date: 2026-05-24

## Operating Principles

- Keep beta instrumentation lightweight and local-first until users explicitly consent to production analytics.
- Use beta feedback to remove friction, not to add unrelated features.
- Treat dietary, allergy, price, and product-match feedback as trust issues.
- Prefer small weekly releases over large redesigns.

## Feedback Capture Flow

In-app beta notes are available in the Plan view. They are stored on the device under `cookr.betaReports.v1` and emit only a lightweight `beta_issue_reported` event with:

- issue type
- current app view
- note length

The free-text note is not sent anywhere by the current app. Closed beta reviewers can export browser storage manually if needed, or a future consented backend can sync reports.

Recommended issue types:

- Confusing UX
- Recipe concern
- Grocery issue
- Bug
- Other

Review priority:

1. Safety or dietary ambiguity.
2. Cooking mode confusion.
3. Grocery/product match errors.
4. Onboarding abandonment.
5. Visual or install issues.

## Beta Issue Reporting Flow

1. User saves a beta note in the app.
2. Reviewer checks local beta reports and event summary.
3. Issue is tagged as safety, conversion, retention, polish, or data quality.
4. Safety and data-quality issues block wider beta rollout.
5. Conversion and retention issues are batched into weekly product fixes.

## Feature Flags And Config

Runtime beta flags live in `src/lib/betaConfig.ts`.

Current flags:

- `maintenanceMode`: shows calm maintenance copy while preserving local plans.
- `feedbackEnabled`: controls the beta feedback panel.
- `analyticsMode`: documents that analytics are local-only.
- `betaSupportEmail`: placeholder support contact for production wiring.

Future flags should be boring and operational:

- disable remote sync
- disable product links
- show outage copy
- hide experimental beta panels

Avoid feature flags for large hidden product experiences during closed beta. They create QA complexity without improving the core loop.

## Maintenance Mode Copy

Default copy:

Cookr is in a short beta maintenance window. Saved plans still work on this device.

Use maintenance mode only when a backend or sync feature is unreliable. Do not use it for normal product uncertainty.

## Sync Failure Copy

User-facing sync errors should never expose provider jargon. Use:

- "We could not send that sign-in link. Check the email address and try again."
- "Saved on this device. Cloud backup is not enabled in this beta build yet."
- "Your plan is saved privately on this device."

Avoid:

- environment variables
- provider names
- stack traces
- database language

## Closed Beta Review Ritual

Daily:

- Check error events, `sync_failure_seen`, and `cooking_session_exited`.
- Read new beta notes.

Twice weekly:

- Review cook-start and cook-completion conversion.
- Identify top recipe families causing "too hard" feedback.

Weekly:

- Review repeat cooking and weekly planner add rate.
- Decide one product fix, one recipe/data fix, and one polish fix.

Exit criteria for wider beta:

- No unresolved safety wording issues.
- No known broken PWA install path.
- Cook completion above 65%.
- Repeat cooking above 15%.
- Shopping list complaints trending down for two cycles.
