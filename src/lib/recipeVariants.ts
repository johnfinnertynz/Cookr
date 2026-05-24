import { recipes } from '../data/recipes'
import type { Recipe, UserProfile } from '../types'
import { recipeMeetsHardConstraints } from './recommendations'

export type RecipeVariant = {
  label: string
  recipe: Recipe
  reason: string
}

const findClosest = (
  current: Recipe,
  profile: UserProfile,
  predicate: (recipe: Recipe) => boolean,
  reason: string,
  label: string,
): RecipeVariant | undefined => {
  const candidate = recipes.find((recipe) =>
    recipe.id !== current.id &&
    recipe.takeawayReplacement === current.takeawayReplacement &&
    recipeMeetsHardConstraints(recipe, profile) &&
    predicate(recipe),
  ) ?? recipes.find((recipe) =>
    recipe.id !== current.id &&
    recipeMeetsHardConstraints(recipe, profile) &&
    predicate(recipe),
  )

  return candidate ? { label, recipe: candidate, reason } : undefined
}

export const getRecipeVariants = (recipe: Recipe, profile: UserProfile): RecipeVariant[] =>
  [
    findClosest(recipe, profile, (candidate) => candidate.effortScore < recipe.effortScore || candidate.timeMinutes <= 15, 'Less active effort for low-energy nights', 'Easier'),
    findClosest(recipe, profile, (candidate) => candidate.costEstimateNzd < recipe.costEstimateNzd, 'Lower estimated cost per serve', 'Cheaper'),
    findClosest(recipe, profile, (candidate) => candidate.proteinEstimateGrams >= Math.max(28, recipe.proteinEstimateGrams + 4), 'More protein without changing the decision too much', 'Higher protein'),
    findClosest(recipe, { ...profile, dietaries: ['vegetarian'] }, (candidate) => candidate.tags.includes('vegetarian'), 'Meat-free swap with similar dinner energy', 'Vegetarian'),
    findClosest(recipe, profile, (candidate) => candidate.tags.includes('no-chop') || candidate.tags.includes('no-cook'), 'Keeps knife work and prep low', 'No-chop'),
  ].filter(Boolean) as RecipeVariant[]
