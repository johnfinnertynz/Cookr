import type { AnalyticsEvent } from '../types'
import { readStoredValue, writeStoredValue } from './storage'

const analyticsKey = 'cookr.analytics.v1'
const sessionKey = 'cookr.session.v1'

const getSessionId = () => {
  if (typeof window === 'undefined') return 'server'
  try {
    const existing = window.sessionStorage.getItem(sessionKey)
    if (existing) return existing
    const next = window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
    window.sessionStorage.setItem(sessionKey, next)
    return next
  } catch {
    return 'session-unavailable'
  }
}

const sanitizeProperties = (properties: AnalyticsEvent['properties'] = {}) =>
  Object.entries(properties).reduce<NonNullable<AnalyticsEvent['properties']>>((safe, [key, value]) => {
    if (typeof value === 'string') safe[key] = value.slice(0, 120)
    else safe[key] = value
    return safe
  }, {})

export const getAnalyticsEvents = () => readStoredValue<AnalyticsEvent[]>(analyticsKey, [])

export const trackEvent = (name: string, properties: AnalyticsEvent['properties'] = {}) => {
  const event: AnalyticsEvent = {
    name,
    properties: {
      ...sanitizeProperties(properties),
      sessionId: getSessionId(),
    },
    occurredAt: new Date().toISOString(),
  }
  const events = getAnalyticsEvents()
  writeStoredValue(analyticsKey, [...events.slice(-299), event])
}

export const getAnalyticsSummary = (events = getAnalyticsEvents()) => {
  const counts = events.reduce<Record<string, number>>((summary, event) => {
    summary[event.name] = (summary[event.name] ?? 0) + 1
    return summary
  }, {})

  const onboardingCompleted = counts.onboarding_completed ?? 0
  const recipesSaved = counts.recipe_saved ?? 0
  const recipesCooked = counts.cooking_completed ?? 0
  const listsCreated = counts.grocery_list_created ?? 0
  const productClicks = counts.product_link_opened ?? 0
  const feedbackEvents = counts.recipe_feedback_added ?? 0
  const sessionStarts = counts.session_started ?? 0
  const sessionCompletes = counts.session_completed ?? 0
  const onboardingStarted = counts.onboarding_started ?? 0
  const recipeViews = counts.recipe_detail_opened ?? 0
  const cookNowClicks = counts.cook_now_clicked ?? 0
  const cookingStarted = counts.cooking_started ?? 0
  const repeatRecipeCooks = counts.repeat_recipe_cooked ?? 0
  const plannerViews = counts.weekly_planner_viewed ?? 0
  const weeklyPlansAdded = counts.weekly_plan_added ?? 0
  const searches = counts.recipe_search_used ?? 0
  const dietaryFiltersUsed = counts.dietary_filter_used ?? 0
  const installAccepted = events.filter((event) => event.name === 'pwa_install_prompt_completed' && event.properties?.outcome === 'accepted').length
  const installDismissed = events.filter((event) => event.name === 'pwa_install_prompt_completed' && event.properties?.outcome === 'dismissed').length
  const dropOffEvents =
    (counts.cooking_session_exited ?? 0) +
    (counts.recipe_marked_too_hard ?? 0) +
    (counts.empty_results_seen ?? 0) +
    (counts.sync_failure_seen ?? 0)

  const rate = (numerator: number, denominator: number) =>
    denominator > 0 ? Math.round((numerator / denominator) * 100) : 0

  return {
    totalEvents: events.length,
    sessionStarts,
    sessionCompletes,
    onboardingStarted,
    onboardingCompleted,
    recipeViews,
    recipesSaved,
    cookNowClicks,
    cookingStarted,
    recipesCooked,
    repeatRecipeCooks,
    listsCreated,
    productClicks,
    plannerViews,
    weeklyPlansAdded,
    searches,
    dietaryFiltersUsed,
    installAccepted,
    installDismissed,
    dropOffEvents,
    feedbackEvents,
    conversion: {
      onboardingCompletionRate: rate(onboardingCompleted, onboardingStarted),
      cookStartRate: rate(cookingStarted, Math.max(recipeViews, cookNowClicks)),
      cookCompletionRate: rate(recipesCooked, cookingStarted),
      listToProductClickRate: rate(productClicks, listsCreated),
      plannerAddRate: rate(weeklyPlansAdded, plannerViews),
      sessionCompletionRate: rate(sessionCompletes, sessionStarts),
    },
    lastEventAt: events.at(-1)?.occurredAt,
  }
}
