# Cookr App Store / Play Store Beta Checklist

Date: 2026-05-24

## Submission Positioning

Short description:
Cookr helps New Zealanders replace takeaways with low-effort guided dinners, grocery lists, and Woolworths NZ search assistance.

Full description:
Cookr is a calm cooking assistant for New Zealanders who want to order fewer takeaways but need dinner to feel realistic. Set your confidence level, available appliances, budget, energy, dietaries, and household size. Cookr recommends low-friction recipes, builds a weekly plan, combines ingredients into a supermarket-friendly grocery list, and opens Woolworths NZ search links for likely products.

Cookr is designed for beginner and low-confidence cooks. Cooking mode shows one step at a time, visual cues, timer prompts, substitutions, and panic help when a recipe feels too hard. Recipes use NZ-style measurements and practical supermarket ingredients.

Feature bullets:
- Low-energy, cook-in-15, post-gym, and use-what-I-have recommendation modes.
- Beginner-safe step-by-step cooking mode.
- Weekly meal planning with ingredient reuse.
- Grocery lists grouped by supermarket aisle.
- Woolworths NZ search-assistant links with confidence labels.
- Saved favourites, cook-again prompts, and local-first offline support.
- Clear guidance that prices, nutrition, dietaries, and product matches are estimates.

Release notes:
This beta focuses on making home cooking feel easier than takeaway. It includes guided onboarding, personalised recipe recommendations, weekly planning, grocery list generation, Woolworths NZ product search links, offline access, and beginner-friendly cooking mode.

TestFlight / Open Beta notes:
Use Cookr for one real dinner decision. Complete onboarding, choose a recipe, add it to your plan, generate a grocery list, open at least one Woolworths link, and try cooking mode. Please report confusing wording, unrealistic recipes, grocery-list mistakes, missing dietary warnings, and any point where ordering takeaway felt easier.

## Metadata

- App name: Cookr
- Subtitle: Easy NZ dinners, less takeaway
- Category: Food & Drink
- Secondary category: Health & Fitness or Lifestyle
- Keywords: cooking, recipes, meal planner, groceries, New Zealand, Woolworths, takeaway, dinner, high protein, budget
- Age rating: 4+, assuming no user-generated public content
- Support URL: Required before store submission
- Marketing URL: Optional for beta, required for public launch quality
- Privacy policy URL: Required
- Terms URL: Strongly recommended

## Visual Assets

- App icon: SVG source exists at `/public/favicon.svg`; create required PNG sizes before native submission.
- Splash screen: PWA uses manifest theme/background colours; native wrappers need generated launch screens.
- Screenshots plan:
  1. Onboarding setup for a tired beginner.
  2. Home screen with "Tonight, without the takeaway".
  3. Recipe card and detail with beginner confidence cues.
  4. Grocery list with Woolworths search-assistant links.
  5. Cooking mode with one large step and panic help.
  6. Weekly plan with ingredient reuse.
- Screenshot rules: Use real app UI, no fabricated prices beyond existing estimated labels, no unsupported Woolworths checkout claim.

## Privacy Policy Draft Points

- Cookr stores profile preferences, plans, favourites, pantry text, local analytics, and feedback locally on the device in this beta.
- If cloud backup is enabled, Cookr may store the user's email, preferences, plans, favourites, feedback, and sync timestamps.
- Cookr does not sell personal information.
- Woolworths links open in the user's browser and are controlled by Woolworths NZ.
- Recipe dietary tags, nutrition, price estimates, and product matches are guidance only.
- Users should check packaging for allergens and dietary suitability.
- Production must provide account deletion and data export if cloud accounts are enabled.

## Terms Draft Points

- Cookr is informational cooking and shopping assistance, not medical, dietary, allergy, religious, or food-safety advice.
- Prices, availability, nutrition, and product matches are estimates and can change.
- Users are responsible for checking product packaging and cooking food safely.
- Woolworths is a third-party service; Cookr does not represent Woolworths and does not automate checkout.
- Recipes and metadata in the app should be original, licensed, or permissibly sourced.

## Technical Store Readiness

- Manifest includes app name, short name, description, id, scope, start URL, display mode, theme colour, background colour, orientation, icons, and shortcuts.
- Web metadata includes description, OpenGraph, Twitter summary card, Apple mobile web app capability, and dark/light theme colour.
- Service worker supports shell caching and offline fallback.
- Offline UX banner exists.
- Safe-area viewport is configured.
- Keyboard-sensitive flows should still be tested on physical iOS and Android devices.

## Final Pre-Submission Checklist

- Run `npm run lint`.
- Run `npm run build`.
- Run `npm run qa:smoke`.
- Verify installed PWA launch from home screen on iOS Safari and Android Chrome.
- Verify offline cooking mode after first load.
- Verify no console errors on first load, onboarding, home, shopping, plan, cook, and learn views.
- Verify recipe images load or degrade acceptably on slow network.
- Verify product links open Woolworths NZ search pages without implying checkout automation.
- Verify privacy policy and terms URLs are live.
- Verify support email or support form is live.
- Verify screenshots use current release UI.
- Verify account copy matches actual cloud-sync configuration.
