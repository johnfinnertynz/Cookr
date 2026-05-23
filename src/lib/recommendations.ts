import { recipes } from '../data/recipes'
import type { Recipe, UserProfile } from '../types'

const confidenceRank = {
  'complete beginner': 1,
  basic: 2,
  comfortable: 3,
  advanced: 4,
}

const timeLimit = {
  'under 15 min': 15,
  'under 30 min': 30,
  'under 45 min': 45,
  'batch cook': 999,
}

export const defaultProfile: UserProfile = {
  confidence: 'complete beginner',
  styles: ['one-pot', 'air fryer', 'oven tray bake'],
  goals: ['reduce takeaways', 'save money', 'high protein'],
  dietaries: ['no restrictions'],
  householdSize: 2,
  budget: 'balanced',
  time: 'under 30 min',
  dislikes: '',
  appliances: ['stovetop', 'oven', 'air fryer', 'microwave'],
  pantryItems: 'soy sauce, rice, olive oil, salt, pepper',
}

export const scoreRecipe = (recipe: Recipe, profile: UserProfile) => {
  let score = recipe.beginnerScore
  const reasons: string[] = []

  const desiredTime = timeLimit[profile.time]
  if (recipe.timeMinutes <= desiredTime) {
    score += 22
    reasons.push(`fits ${profile.time}`)
  } else {
    score -= Math.min(22, recipe.timeMinutes - desiredTime)
  }

  if (confidenceRank[recipe.difficulty] <= confidenceRank[profile.confidence] + 1) {
    score += 18
    reasons.push('confidence-friendly')
  } else {
    score -= 20
  }

  const styleHits = profile.styles.filter((style) => recipe.tags.includes(style) || recipe.appliances.includes(style))
  score += styleHits.length * 10
  if (styleHits.length) reasons.push(styleHits.slice(0, 2).join(', '))

  const goalText = profile.goals.join(' ')
  if (goalText.includes('save money') && recipe.costEstimateNzd <= 5.5) {
    score += 16
    reasons.push('low cost')
  }
  if ((goalText.includes('high protein') || goalText.includes('bulk')) && recipe.proteinEstimateGrams >= 28) {
    score += 16
    reasons.push('high protein')
  }
  if ((goalText.includes('health') || goalText.includes('lose weight')) && recipe.nutrition.fibre >= 6) {
    score += 8
    reasons.push('balanced')
  }
  if (goalText.includes('reduce takeaways') || recipe.tags.includes('fakeaway')) {
    score += 12
    reasons.push(`${recipe.takeawayReplacement} fakeaway`)
  }

  if (profile.budget === 'tight' && recipe.costEstimateNzd > 5.5) score -= 12
  if (profile.dietaries.includes('vegetarian') && !recipe.tags.includes('vegetarian')) score -= 35
  if (profile.dietaries.includes('vegan') && !recipe.tags.includes('vegan')) score -= 50

  const disliked = profile.dislikes
    .toLowerCase()
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
  if (disliked.some((item) => recipe.ingredients.some((ingredient) => ingredient.name.includes(item)))) {
    score -= 60
    reasons.push('contains a disliked ingredient')
  }

  const missingAppliances = recipe.appliances.filter((appliance) => !profile.appliances.includes(appliance))
  score -= missingAppliances.length * 18

  score -= recipe.dishesUsed * 3
  return { score, reasons: reasons.slice(0, 4) }
}

export const getRankedRecipes = (profile: UserProfile) =>
  recipes
    .map((recipe) => ({ recipe, ...scoreRecipe(recipe, profile) }))
    .sort((a, b) => b.score - a.score)

export const filterRecipes = (activeFilters: string[], profile: UserProfile) => {
  const ranked = getRankedRecipes(profile)
  if (!activeFilters.length) return ranked

  return ranked.filter(({ recipe }) =>
    activeFilters.every((filter) => {
      if (filter === 'easy/fast') return recipe.timeMinutes <= 30 && recipe.beginnerScore >= 85
      if (filter === 'cheap') return recipe.costEstimateNzd <= 5.5
      if (filter === 'high protein') return recipe.proteinEstimateGrams >= 28
      if (filter === 'healthy') return recipe.nutrition.fibre >= 6
      if (filter === 'minimal cleanup') return recipe.cleanupLevel === 'low'
      if (filter === 'under 5 ingredients') return recipe.ingredients.length <= 5
      if (filter === 'beginner recipes') return recipe.beginnerScore >= 90
      if (filter === 'nz supermarket-friendly') return recipe.tags.includes('nz supermarket-friendly') || recipe.ingredients.every((item) => item.productKey)
      return recipe.tags.includes(filter) || recipe.appliances.includes(filter)
    }),
  )
}
