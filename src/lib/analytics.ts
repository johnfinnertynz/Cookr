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
