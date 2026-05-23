import { fallbackProductMatch, productMatches } from '../data/products'
import { formatQuantity, normalizeIngredientName, normalizeIngredientQuantity, parseOwnedItems } from './ingredients'
import type { GroceryLine, Ingredient, Recipe } from '../types'

const makeKey = (ingredient: Ingredient) => {
  const normalized = normalizeIngredientQuantity(ingredient)
  return `${normalizeIngredientName(ingredient)}-${normalized.unit}`
}

export const buildGroceryList = (selectedRecipes: Recipe[], ownedItems: string): GroceryLine[] => {
  const owned = parseOwnedItems(ownedItems)

  const lines = new Map<string, GroceryLine>()

  selectedRecipes.forEach((recipe) => {
    recipe.ingredients.forEach((ingredient) => {
      const key = makeKey(ingredient)
      const existing = lines.get(key)
      const canonicalName = normalizeIngredientName(ingredient)
      const normalized = normalizeIngredientQuantity(ingredient)
      const checked = owned.some((item) => canonicalName.includes(item) || item.includes(canonicalName)) || Boolean(ingredient.pantry)
      const match = ingredient.productKey
        ? productMatches[ingredient.productKey] ?? fallbackProductMatch(ingredient.name)
        : fallbackProductMatch(ingredient.name)

      if (existing) {
        existing.normalizedQuantity += normalized.quantity
        existing.quantity = existing.normalizedQuantity
        existing.displayQuantity = formatQuantity(existing.normalizedQuantity, existing.normalizedUnit)
        existing.recipeIds.push(recipe.id)
        existing.checked = existing.checked || checked
      } else {
        lines.set(key, {
          ...ingredient,
          name: canonicalName,
          displayQuantity: formatQuantity(normalized.quantity, normalized.unit),
          recipeIds: [recipe.id],
          checked,
          match,
          normalizedQuantity: normalized.quantity,
          normalizedUnit: normalized.unit,
          confidenceNote: normalized.confidenceNote,
        })
      }
    })
  })

  return Array.from(lines.values()).sort((a, b) => {
    if (a.pantry !== b.pantry) return a.pantry ? 1 : -1
    return a.category.localeCompare(b.category) || a.name.localeCompare(b.name)
  })
}

export const estimateBasketTotal = (lines: GroceryLine[]) =>
  lines.reduce((total, line) => total + (line.checked ? 0 : line.match.estimatedPriceNzd ?? 0), 0)
