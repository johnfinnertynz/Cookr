export type Confidence = 'complete beginner' | 'basic' | 'comfortable' | 'advanced'

export type BudgetLevel = 'tight' | 'balanced' | 'flexible'

export type TimeAvailable = 'under 15 min' | 'under 30 min' | 'under 45 min' | 'batch cook'

export type TonightMode = 'no_energy' | 'cook_15' | 'post_gym' | 'use_what_i_have' | 'normal'

export type ScheduleType = 'standard' | 'student' | 'shift_worker' | 'family' | 'gym'

export type Recipe = {
  id: string
  title: string
  source: string
  sourceUrl: string
  licenseNote: string
  image: string
  ingredients: Ingredient[]
  instructions: string[]
  activeTimeMinutes: number
  timeMinutes: number
  servings: number
  difficulty: Confidence
  costEstimateNzd: number
  proteinEstimateGrams: number
  tags: string[]
  cuisine: string
  appliances: string[]
  beginnerScore: number
  takeawayReplacement: string
  cleanupLevel: 'low' | 'medium' | 'high'
  dishesUsed: number
  effortScore: number
  skillTips: string[]
  visualCues: string[]
  leftovers: string[]
  nutrition: {
    calories: number
    protein: number
    fibre: number
  }
}

export type Ingredient = {
  name: string
  quantity: number
  unit: string
  canonicalName?: string
  category: GroceryCategory
  pantry?: boolean
  optional?: boolean
  productKey?: string
}

export type GroceryCategory =
  | 'Produce'
  | 'Meat & Seafood'
  | 'Chilled'
  | 'Pantry'
  | 'Bakery'
  | 'Frozen'
  | 'International'
  | 'Household'

export type UserProfile = {
  confidence: Confidence
  styles: string[]
  goals: string[]
  dietaries: string[]
  householdSize: number
  budget: BudgetLevel
  time: TimeAvailable
  dislikes: string
  appliances: string[]
  pantryItems: string
  blockers: string[]
  energyLevel: number
  scheduleType: ScheduleType
}

export type MatchedProduct = {
  productKey: string
  ingredient: string
  name: string
  size: string
  estimatedPriceNzd?: number
  confidence: 'high' | 'medium' | 'low'
  woolworthsUrl: string
  searchUrl: string
  note: string
}

export type GroceryLine = Ingredient & {
  displayQuantity: string
  recipeIds: string[]
  checked: boolean
  match: MatchedProduct
  normalizedQuantity: number
  normalizedUnit: string
  confidenceNote: string
}

export type RecipeInteraction = {
  recipeId: string
  saved?: boolean
  cookedCount?: number
  tooHardCount?: number
  lastCookedAt?: string
  wouldRepeat?: boolean
}

export type RecommendationContext = {
  mode: TonightMode
  hour: number
  energyLevel: number
  pantryItems: string[]
  interactions: RecipeInteraction[]
}

export type AnalyticsEvent = {
  name: string
  occurredAt: string
  properties?: Record<string, string | number | boolean | null>
}
