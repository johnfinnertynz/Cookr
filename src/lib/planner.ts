import { fallbackProductMatch, productMatches } from '../data/products'
import type { MatchedProduct, Recipe, RecipeInteraction, UserProfile } from '../types'

type RankedRecipe = {
  recipe: Recipe
  score: number
  reasons: string[]
}

export type WeeklyPlanSlot = {
  id: string
  label: string
  recipe: Recipe
  reason: string
}

export type StarterPantryItem = {
  key: string
  name: string
  why: string
  match: MatchedProduct
}

const uniqueByRecipe = (slots: WeeklyPlanSlot[]) => {
  const seen = new Set<string>()
  return slots.filter((slot) => {
    if (seen.has(slot.recipe.id)) return false
    seen.add(slot.recipe.id)
    return true
  })
}

const firstRecipe = (ranked: RankedRecipe[], predicate: (recipe: Recipe) => boolean, fallbackIndex = 0) =>
  ranked.find(({ recipe }) => predicate(recipe))?.recipe ?? ranked[fallbackIndex]?.recipe ?? ranked[0]?.recipe

const sharesIngredientWith = (recipe: Recipe, selected: Recipe[]) => {
  const selectedIngredients = new Set(selected.flatMap((item) => item.ingredients.map((ingredient) => ingredient.canonicalName ?? ingredient.name)))
  return recipe.ingredients.some((ingredient) => selectedIngredients.has(ingredient.canonicalName ?? ingredient.name))
}

export const buildWeeklyPlan = (
  ranked: RankedRecipe[],
  profile: UserProfile,
  interactions: RecipeInteraction[],
): WeeklyPlanSlot[] => {
  if (!ranked.length) return []

  const recentRepeatIds = new Set(interactions.filter((interaction) => interaction.wouldRepeat).map((interaction) => interaction.recipeId))
  const top = ranked[0].recipe
  const repeat = firstRecipe(ranked, (recipe) => recentRepeatIds.has(recipe.id), 1)
  const rescue = firstRecipe(ranked, (recipe) => recipe.timeMinutes <= 15 || recipe.effortScore <= 1, 1)
  const batch = firstRecipe(ranked, (recipe) => recipe.tags.includes('meal prep') || recipe.servings >= Math.max(4, profile.householdSize), 2)
  const selected = [top, repeat, rescue, batch].filter(Boolean)
  const overlap = firstRecipe(ranked, (recipe) => sharesIngredientWith(recipe, selected) && !selected.some((item) => item.id === recipe.id), 3)

  return uniqueByRecipe([
    { id: 'tonight', label: 'Tonight', recipe: top, reason: 'Best fit for your current mode' },
    { id: 'repeat', label: 'Cook again', recipe: repeat, reason: recentRepeatIds.has(repeat.id) ? 'A trusted repeat' : 'Reliable low-friction backup' },
    { id: 'rescue', label: '15-min rescue', recipe: rescue, reason: 'For the night that tries to become delivery' },
    { id: 'batch', label: 'Batch cook', recipe: batch, reason: 'Covers leftovers or family portions' },
    { id: 'overlap', label: 'Use it up', recipe: overlap, reason: 'Keeps the shop smaller by reusing ingredients' },
  ]).slice(0, 5)
}

const pantryItems: Array<Omit<StarterPantryItem, 'match'>> = [
  { key: 'brown-rice-pouch', name: 'Microwave rice', why: 'Turns almost any protein or canned food into dinner.' },
  { key: 'instant-noodles', name: 'Instant noodles', why: 'Emergency base for student, shift-work, and no-energy nights.' },
  { key: 'soy-sauce', name: 'Soy sauce', why: 'Fast flavour for rice, noodles, eggs, tofu, and mince.' },
  { key: 'peanut-butter', name: 'Peanut butter', why: 'Makes a filling sauce without cooking skill.' },
  { key: 'crushed-tomatoes', name: 'Canned tomatoes', why: 'Base for chilli, pasta, curry, and pantry bowls.' },
  { key: 'chickpeas', name: 'Chickpeas', why: 'Cheap vegetarian protein with no prep.' },
  { key: 'frozen-mixed-veg', name: 'Frozen mixed vegetables', why: 'Low-waste vegetables when chopping is not happening.' },
  { key: 'mini-wraps', name: 'Wraps', why: 'Transforms leftovers into tomorrow lunch.' },
]

export const getStarterPantryBundle = (profile: UserProfile): StarterPantryItem[] => {
  const priorityKeys = new Set<string>()
  if (profile.budget === 'tight' || profile.scheduleType === 'student') {
    ['instant-noodles', 'peanut-butter', 'soy-sauce', 'crushed-tomatoes'].forEach((key) => priorityKeys.add(key))
  }
  if (profile.dietaries.includes('vegetarian') || profile.dietaries.includes('vegan')) {
    ['chickpeas', 'crushed-tomatoes', 'frozen-mixed-veg'].forEach((key) => priorityKeys.add(key))
  }
  if (profile.blockers.includes('too tired') || profile.energyLevel <= 2) {
    ['brown-rice-pouch', 'frozen-mixed-veg', 'mini-wraps'].forEach((key) => priorityKeys.add(key))
  }

  const sorted = [...pantryItems].sort((a, b) => Number(priorityKeys.has(b.key)) - Number(priorityKeys.has(a.key)))
  return sorted.slice(0, 6).map((item) => ({
    ...item,
    match: productMatches[item.key] ?? fallbackProductMatch(item.name),
  }))
}
