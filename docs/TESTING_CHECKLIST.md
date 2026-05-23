# Testing Checklist

## Functional
- Complete onboarding with default values.
- Change confidence, goals, dietaries, appliances, pantry, and disliked ingredients.
- Toggle every recipe filter and confirm results update.
- Add and remove recipes from the plan.
- Save and unsave a favourite recipe.
- Open a recipe detail and start cooking.
- Move forward and backward through cooking steps.
- Scale servings and confirm prep quantities update.
- Open cooking term details.
- Generate grocery list from selected meals.
- Tick and untick grocery items.
- Open Woolworths search links in a new tab.

## Data and Safety
- Confirm recipe source/licensing notes are visible.
- Confirm prices are labelled as estimates.
- Confirm Woolworths integration does not scrape pages or claim checkout automation.
- Confirm fallback product matches produce search links.

## Responsive and Accessibility
- Test at 390px mobile width.
- Test at tablet width.
- Test at desktop width.
- Navigate primary controls with keyboard.
- Check focus states are visible.
- Check colour contrast in light and dark mode.
- Confirm large cooking instructions fit on mobile.

## Build
- Run `npm run build`.
- Run `npm run lint`.
- Run `npm run qa:smoke` with the dev server running at `http://127.0.0.1:5173`.
