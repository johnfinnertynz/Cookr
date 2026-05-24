# Cookr Closed Beta Conversion Analysis

Date: 2026-05-24

## Core Conversion Question

At 6pm, a tired person should be able to open Cookr and answer three questions quickly:

1. What should I cook?
2. Do I have enough to make it happen?
3. What is the next tiny step?

If the user has to browse like a recipe database, Cookr loses to takeaway.

## Funnel

1. App open -> useful recommendation
   - Current support: persisted profile, time/energy-aware recommendation mode, top recommendation hero.
   - Closed-beta improvement: default recipe grid reduced to 12 cards and filters become horizontal on mobile so Home feels less like a catalogue.
   - Metric: `session_started` to `cook_now_clicked` or `recipe_detail_opened`.

2. Recommendation -> cooking intent
   - Current support: hero "Start cooking", recipe card actions, easier fallback.
   - Closed-beta improvement: `cook_now_clicked` event records intent before the cooking transition.
   - Metric: `cook_now_clicked` to `cooking_started`.

3. Plan/list -> cooking
   - Current support: shopping list grouped by aisle, Woolworths search links, selected recipe plan.
   - Closed-beta improvement: shopping list now has a "Cook first meal" action to reduce post-shop drop-off.
   - Metric: `grocery_list_created`, `product_link_opened`, `shopping_to_cook_clicked`.

4. Cooking -> completion
   - Current support: one step at a time, visual cues, panic help, too-hard fallback.
   - Closed-beta improvement: cooking exits are tracked as a drop-off signal unless the user marks the recipe cooked.
   - Metric: `cooking_started` to `cooking_completed`; warning events are `cooking_session_exited` and `recipe_marked_too_hard`.

5. Completion -> next session
   - Current support: feedback prompt, saved favourites, weekly plan, repeat ranking.
   - Closed-beta improvement: Home quick-plan panel now surfaces "Cook again" and "Open list" as return paths.
   - Metric: `repeat_recipe_cooked`, `quick_plan_list_opened`, `weekly_plan_added`.

## Improvements Made In This Pass

- Added local session and funnel telemetry with no external SDK.
- Added cook-now intent tracking before cooking mode opens.
- Added recipe search, filter, dietary-filter, empty-results, planner, install, repeat-cook, and session-completion events.
- Added an empty analytics state so beta reviewers know what to do before data exists.
- Reduced first-screen recipe overload by showing fewer recipe cards initially.
- Added a quick return path for repeat meals and shopping list access.
- Added a shopping-list-to-cooking CTA.
- Added beta feedback capture with local-only storage and no personal-data requirement.

## Remaining Conversion Risks

- Users may still scroll past the top recommendation if the hero does not feel emotionally specific enough.
- If a user's pantry list is empty, the shopping step can still feel like a full supermarket trip.
- Product links are helpful but not a basket; some users may expect checkout automation.
- Cooking mode completion depends on users pressing "Mark cooked"; some real cooks may simply leave.
- The repeat loop is still implicit. Beta should verify whether users notice "Cook again".

## Recommended Beta Experiments

1. Test whether "No energy" mode should be the default after 5pm for more users.
2. Test whether new users should see only one recommended recipe plus one fallback before the full grid.
3. Test whether "Cook first meal" on the shopping list improves completion.
4. Test whether repeat recipe prompts should appear after one cook or only after positive feedback.
5. Test whether grocery confidence copy increases or decreases Woolworths link clicks.

## Public Launch Recommendation

Do not public-launch broadly yet. Run closed beta until the app proves:

- Cook completion consistently exceeds 65%.
- At least 15% of completed cooks become repeat cooks.
- Empty-results events are rare for vegetarian, high-protein, budget, and low-energy users.
- Beta notes stop clustering around "too many choices", "shopping felt hard", or "I was not sure what to do next".
