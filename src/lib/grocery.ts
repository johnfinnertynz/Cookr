import { fallbackProductMatch, productMatches } from '../data/products'
import type { GroceryLine, Ingredient, Recipe } from '../types'

const roundQuantity = (value: number) => {
  if (Number.isInteger(value)) return String(value)
  return value.toFixed(1).replace('.0', '')
}

const makeKey = (ingredient: Ingredient) => `${ingredient.name.toLowerCase()}-${ingredient.unit}`

export const buildGroceryList = (selectedRecipes: Recipe[], ownedItems: string): GroceryLine[] => {
  const owned = ownedItems
    .toLowerCase()
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

  const lines = new Map<string, GroceryLine>()

  selectedRecipes.forEach((recipe) => {
    recipe.ingredients.forEach((ingredient) => {
      const key = makeKey(ingredient)
      const existing = lines.get(key)
      const checked = owned.some((item) => ingredient.name.includes(item)) || Boolean(ingredient.pantry)
      const match = ingredient.productKey
        ? productMatches[ingredient.productKey] ?? fallbackProductMatch(ingredient.name)
        : fallbackProductMatch(ingredient.name)

      if (existing) {
        existing.quantity += ingredient.quantity
        existing.displayQuantity = `${roundQuantity(existing.quantity)} ${existing.unit}`
        existing.recipeIds.push(recipe.id)
        existing.checked = existing.checked || checked
      } else {
        lines.set(key, {
          ...ingredient,
          displayQuantity: `${roundQuantity(ingredient.quantity)} ${ingredient.unit}`,
          recipeIds: [recipe.id],
          checked,
          match,
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
