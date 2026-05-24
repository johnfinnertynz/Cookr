import type { AnalyticsEvent } from '../types'
import { readStoredValue, writeStoredValue } from './storage'

const analyticsKey = 'cookr.analytics.v1'

export const getAnalyticsEvents = () => readStoredValue<AnalyticsEvent[]>(analyticsKey, [])

export const trackEvent = (name: string, properties: AnalyticsEvent['properties'] = {}) => {
  const event: AnalyticsEvent = {
    name,
    properties,
    occurredAt: new Date().toISOString(),
  }
  const events = getAnalyticsEvents()
  writeStoredValue(analyticsKey, [...events.slice(-149), event])
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

  return {
    totalEvents: events.length,
    onboardingCompleted,
    recipesSaved,
    recipesCooked,
    listsCreated,
    productClicks,
    feedbackEvents,
    lastEventAt: events.at(-1)?.occurredAt,
  }
}
