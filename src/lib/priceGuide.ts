import type { GroceryLine } from '../types'

export const getBasketPriceConfidence = (lines: GroceryLine[]) => {
  if (!lines.length) return { label: 'No basket yet', high: 0, medium: 0, low: 0, copy: 'Add meals to estimate a shop.' }

  const summary = lines.reduce(
    (counts, line) => {
      counts[line.match.confidence] += 1
      return counts
    },
    { high: 0, medium: 0, low: 0 },
  )

  const label = summary.low > 0 ? 'Mixed confidence' : summary.medium > 0 ? 'Mostly reliable' : 'High confidence'
  const copy =
    summary.low > 0
      ? 'Some items need user choice in Woolworths search.'
      : summary.medium > 0
        ? 'Most estimates use common product sizes; check specials.'
        : 'All visible estimates are common product matches.'

  return { ...summary, label, copy }
}
