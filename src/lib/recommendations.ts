import { recipes } from '../data/recipes'
import type { RecommendationContext, Recipe, RecipeInteraction, TonightMode, UserProfile } from '../types'

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
  blockers: ['too tired', 'too many dishes'],
  energyLevel: 2,
  scheduleType: 'standard',
}

const parsePantry = (pantryItems: string) =>
  pantryItems
    .toLowerCase()
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

const getInteraction = (recipeId: string, interactions: RecipeInteraction[] = []) =>
  interactions.find((interaction) => interaction.recipeId === recipeId)

const getRequiredAppliances = (recipe: Recipe) => {
  const primaryAppliances = recipe.appliances.filter((appliance) => appliance !== 'microwave')
  return primaryAppliances.length ? primaryAppliances : recipe.appliances
}

export const recipeMeetsHardConstraints = (recipe: Recipe, profile: UserProfile) => {
  if (profile.dietaries.includes('vegetarian') && !recipe.tags.includes('vegetarian')) return false
  if (profile.dietaries.includes('vegan') && !recipe.tags.includes('vegan')) return false
  const ingredientText = recipe.ingredients.map((ingredient) => `${ingredient.name} ${ingredient.canonicalName ?? ''}`).join(' ').toLowerCase()
  if (profile.dietaries.includes('gluten-free') && /(pasta|wrap|pita|bread|noodles|flour|oats)/.test(ingredientText)) return false
  if (profile.dietaries.includes('dairy-free') && /(yoghurt|mozzarella|sour cream|cheese|butter)/.test(ingredientText)) return false
  if (profile.dietaries.includes('halal') && /(pork|bacon|ham|sausage|sausages)/.test(ingredientText)) return false
  const requiredAppliances = getRequiredAppliances(recipe)
  if (
    profile.appliances.length > 0 &&
    requiredAppliances.length > 0 &&
    requiredAppliances.some((appliance) => !profile.appliances.includes(appliance))
  ) {
    return false
  }
  return true
}

const modeScore = (recipe: Recipe, mode: TonightMode) => {
  if (mode === 'no_energy') {
    return (recipe.effortScore <= 1 ? 26 : 0) + (recipe.cleanupLevel === 'low' ? 10 : 0) - recipe.activeTimeMinutes
  }
  if (mode === 'cook_15') return recipe.timeMinutes <= 15 ? 28 : -Math.min(24, recipe.timeMinutes - 15)
  if (mode === 'post_gym') return recipe.proteinEstimateGrams >= 30 ? 24 : 0
  if (mode === 'use_what_i_have') return recipe.tags.includes('pantry') ? 16 : 0
  return recipe.tags.includes('fakeaway') ? 8 : 0
}

export const getDefaultModeForHour = (hour: number): TonightMode => {
  if (hour >= 20 || hour < 5) return 'no_energy'
  if (hour >= 16 && hour <= 19) return 'cook_15'
  return 'normal'
}

export const makeRecommendationContext = (
  profile: UserProfile,
  overrides: Partial<RecommendationContext> = {},
): RecommendationContext => ({
  mode: overrides.mode ?? getDefaultModeForHour(new Date().getHours()),
  hour: overrides.hour ?? new Date().getHours(),
  energyLevel: overrides.energyLevel ?? profile.energyLevel,
  pantryItems: overrides.pantryItems ?? parsePantry(profile.pantryItems),
  interactions: overrides.interactions ?? [],
})

export const scoreRecipe = (recipe: Recipe, profile: UserProfile, context = makeRecommendationContext(profile)) => {
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
  if (profile.confidence === 'complete beginner' && recipe.difficulty === 'complete beginner') score += 14
  if (profile.confidence === 'complete beginner' && recipe.effortScore <= 1) score += 10
  if (profile.confidence === 'complete beginner' && recipe.difficulty !== 'complete beginner') score -= 12

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
  if (goalText.includes('reduce takeaways')) {
    score += recipe.tags.includes('fakeaway') ? 16 : 8
    reasons.push(recipe.tags.includes('fakeaway') ? `${recipe.takeawayReplacement} takeaway swap` : 'takeaway-safe fallback')
  } else if (recipe.tags.includes('fakeaway')) {
    score += 8
    reasons.push('takeaway-style')
  }
  if (goalText.includes('family meals') && recipe.takeawayReplacement === 'comfort food') {
    score += 45
    reasons.push('family comfort meal')
  }

  score += modeScore(recipe, context.mode)
  if (context.mode === 'no_energy' && recipe.effortScore <= 1) reasons.push('low-energy friendly')
  if (context.mode === 'cook_15' && recipe.timeMinutes <= 15) reasons.push('15-minute rescue')
  if (context.mode === 'post_gym' && recipe.proteinEstimateGrams >= 30) reasons.push('post-gym protein')

  if (profile.budget === 'tight' && recipe.costEstimateNzd <= 3.5) {
    score += 18
    reasons.push('student-budget friendly')
  }
  if (profile.budget === 'tight' && recipe.costEstimateNzd > 5.5) score -= 28
  if (profile.dietaries.includes('vegetarian') && !recipe.tags.includes('vegetarian')) score -= 120
  if (profile.dietaries.includes('vegan') && !recipe.tags.includes('vegan')) score -= 140
  if (profile.scheduleType === 'student' && recipe.tags.includes('cheap')) score += 18
  if (profile.scheduleType === 'shift_worker' && (recipe.timeMinutes <= 20 || recipe.tags.includes('meal prep'))) score += 16
  if (profile.scheduleType === 'family' && recipe.tags.includes('family-friendly')) score += 30
  if ((profile.scheduleType === 'family' || profile.householdSize >= 4) && recipe.servings >= 4) score += 14
  if (profile.scheduleType === 'gym' && recipe.proteinEstimateGrams >= 30) score += 18

  const disliked = profile.dislikes
    .toLowerCase()
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
  if (disliked.some((item) =>
    recipe.ingredients.some((ingredient) => ingredient.name.includes(item) || ingredient.canonicalName?.includes(item)) ||
    recipe.title.toLowerCase().includes(item) ||
    recipe.takeawayReplacement.includes(item) ||
    (item === 'spicy' && ['curry', 'chilli', 'satay'].some((word) => `${recipe.title} ${recipe.takeawayReplacement} ${recipe.cuisine}`.toLowerCase().includes(word)))
  )) {
    score -= 60
    reasons.push('contains a disliked ingredient')
  }

  const missingAppliances = getRequiredAppliances(recipe).filter((appliance) => !profile.appliances.includes(appliance))
  score -= missingAppliances.length * 34
  if (missingAppliances.length === recipe.appliances.length && recipe.appliances.length > 0) score -= 28

  const pantryHits = recipe.ingredients.filter((ingredient) =>
    context.pantryItems.some((item) => ingredient.name.includes(item) || ingredient.canonicalName?.includes(item)),
  ).length
  if (pantryHits) {
    score += pantryHits * 7
    reasons.push('uses pantry items')
  }

  const interaction = getInteraction(recipe.id, context.interactions)
  if (interaction?.wouldRepeat) {
    score += 12
    reasons.push('trusted repeat')
  }
  if (interaction?.cookedCount) score += Math.min(12, interaction.cookedCount * 3)
  if (interaction?.tooHardCount) score -= interaction.tooHardCount * 22

  score -= recipe.dishesUsed * 4
  score -= recipe.effortScore * Math.max(1, 5 - context.energyLevel)
  if (context.hour >= 20 && recipe.timeMinutes > 20) score -= 12

  return { score, reasons: reasons.slice(0, 4) }
}

export const getRankedRecipes = (profile: UserProfile, context = makeRecommendationContext(profile)) =>
  recipes
    .filter((recipe) => recipeMeetsHardConstraints(recipe, profile))
    .map((recipe) => ({ recipe, ...scoreRecipe(recipe, profile, context) }))
    .sort((a, b) => b.score - a.score)

export const filterRecipes = (activeFilters: string[], profile: UserProfile, context = makeRecommendationContext(profile)) => {
  const ranked = getRankedRecipes(profile, context)
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
      if (filter === 'no energy') return recipe.effortScore <= 1
      if (filter === 'cook in 15') return recipe.timeMinutes <= 15
      return recipe.tags.includes(filter) || recipe.appliances.includes(filter)
    }),
  )
}

export const getIngredientOverlapScore = (selectedRecipes: Recipe[]) => {
  const counts = new Map<string, number>()
  selectedRecipes.forEach((recipe) => {
    recipe.ingredients.forEach((ingredient) => {
      const key = ingredient.canonicalName ?? ingredient.name
      counts.set(key, (counts.get(key) ?? 0) + 1)
    })
  })
  return Array.from(counts.values()).filter((count) => count > 1).length
}
