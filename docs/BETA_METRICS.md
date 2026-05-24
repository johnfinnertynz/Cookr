# Cookr Closed Beta Metrics

Date: 2026-05-24

Cookr beta telemetry is local-first and privacy-conscious. The app records lightweight product events in browser storage so beta builds can inspect funnel health without adding an invasive analytics SDK. It should not collect free-text search terms, personal health details, allergy details, exact addresses, or checkout behaviour.

## Metrics That Matter Most

1. First recipe time
   - Proxy events: `session_started`, `recipe_detail_opened`, `cook_now_clicked`.
   - Healthy beta range: 60-80% of onboarded users reach a recipe view or cook-now action in the first session.
   - Warning: users open Home but do not click a recipe, search, filter, list, or cook action.

2. Cook-start conversion
   - Proxy events: `recipe_detail_opened`, `cook_now_clicked`, `cooking_started`.
   - Healthy beta range: 35-55% of recipe viewers start cooking during a real dinner-session beta.
   - Warning: high recipe views with low cook starts means Cookr feels like browsing, not assistance.

3. Cook completion
   - Proxy events: `cooking_started`, `cooking_completed`, `cooking_session_exited`, `recipe_marked_too_hard`.
   - Healthy beta range: 65-80% of cooking sessions complete.
   - Warning: exits from cooking mode usually mean steps are unclear, timing is unrealistic, or the recipe felt too hard.

4. Shopping-list conversion
   - Proxy events: `grocery_list_created`, `product_link_opened`, `shopping_to_cook_clicked`.
   - Healthy beta range: 30-50% of grocery-list sessions open at least one product link in early beta.
   - Warning: low product clicks can mean users do not trust matches, already own ingredients, or the list is too long.

5. Weekly planning usage
   - Proxy events: `weekly_planner_viewed`, `weekly_plan_added`.
   - Healthy beta range: 20-35% of active beta users add a weekly plan after first successful cook.
   - Warning: high planner views with low adds means the plan feels too ambitious or not relevant enough.

6. Repeat cooking
   - Proxy events: `repeat_recipe_cooked`, `recipe_feedback_added` with `would_repeat`.
   - Healthy beta range: 15-25% of cooks become repeats during a small closed beta.
   - Warning: if users cook once but never repeat, recipes may be too novel, shopping friction too high, or value not clear tomorrow.

7. Search and filter recovery
   - Proxy events: `recipe_search_used`, `recipe_filter_toggled`, `dietary_filter_used`, `empty_results_seen`.
   - Healthy beta range: search should help users recover, not become the main path.
   - Warning: high search/filter usage before first cook means recommendations are missing obvious needs.

8. Install intent
   - Proxy events: `install_prompt_available`, `pwa_install_prompt_completed`.
   - Healthy beta range: 10-20% install acceptance among users who cook or create a list.
   - Warning: prompt dismissal before any cook action suggests install timing is too early.

## Drop-Off Indicators

- `onboarding_started` without `onboarding_completed`: setup is too long or intimidating.
- `empty_results_seen`: filters are too strict, dietaries are blocking too much, or the catalogue needs safer options.
- `cook_now_clicked` without `cooking_started`: app transition problem or perceived hesitation.
- `cooking_session_exited` without completion: cooking mode did not reduce anxiety enough.
- `recipe_marked_too_hard`: recipe metadata overestimated beginner friendliness.
- `sync_failure_seen`: account copy or beta backend reliability is damaging trust.

## Likely Causes Of Poor Retention

- The first recommendation does not match the user's emotional state at 6pm.
- The user has to browse too many cards before committing.
- Grocery list feels like work instead of relief.
- Product matches are uncertain or prices feel misleading.
- The recipe technically works but does not feel worth repeating.
- Cooking mode is readable but not calming enough during stress.
- The app does not give a good reason to reopen tomorrow.
- Weekly planning feels like homework before the user has one successful meal.

## Closed Beta Review Cadence

- Daily: inspect error/drop-off events and top beta notes.
- Twice weekly: review cook-start and cook-completion rates.
- Weekly: review repeat cooking, planner add rate, and top recipe complaints.
- Before public launch: require at least one cohort with repeat cooking above 15% and cooking completion above 65%.
