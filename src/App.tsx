import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  BadgeCheck,
  BarChart3,
  BatteryLow,
  BookOpen,
  CalendarDays,
  ChefHat,
  ChevronRight,
  Clock3,
  Cloud,
  Dumbbell,
  Flame,
  Heart,
  ImageOff,
  MessageSquare,
  Minus,
  Moon,
  PackageCheck,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  ShoppingBasket,
  Sparkles,
  Timer,
  WifiOff,
  Zap,
} from 'lucide-react'
import './App.css'
import { recipes } from './data/recipes'
import { cookingTerms, panicHelp, substitutions } from './lib/cookingHelp'
import { betaConfig } from './lib/betaConfig'
import { buildGroceryList, estimateBasketTotal } from './lib/grocery'
import {
  defaultProfile,
  filterRecipes,
  getIngredientOverlapScore,
  getRankedRecipes,
  makeRecommendationContext,
  recipeMeetsHardConstraints,
} from './lib/recommendations'
import { buildWeeklyPlan, getStarterPantryBundle, type StarterPantryItem, type WeeklyPlanSlot } from './lib/planner'
import { getRecipeVariants, type RecipeVariant } from './lib/recipeVariants'
import { getBasketPriceConfidence } from './lib/priceGuide'
import { defaultAccountState, markLocalSyncSnapshot, requestMagicLink } from './lib/account'
import { isCloudSyncAvailable } from './lib/supabase'
import { useInstallPrompt } from './lib/pwa'
import { getAnalyticsEvents, getAnalyticsSummary, trackEvent } from './lib/analytics'
import { readStoredValue, useOnlineStatus, useStoredState, writeStoredValue } from './lib/storage'
import type { AccountState, BetaIssueReport, Recipe, RecipeFeedback, RecipeInteraction, TonightMode, UserProfile } from './types'

const filters = [
  'easy/fast',
  'no energy',
  'cook in 15',
  'cheap',
  'high protein',
  'healthy',
  'one-pot',
  'minimal cleanup',
  'meal prep',
  'family-friendly',
  'vegetarian',
  'under 5 ingredients',
  'beginner recipes',
  'nz supermarket-friendly',
]

const confidenceOptions = ['complete beginner', 'basic', 'comfortable', 'advanced'] as const
const styleOptions = ['one-pot', 'air fryer', 'oven tray bake', 'slow cooker', 'stovetop', 'meal prep', 'no-cook']
const goalOptions = ['save money', 'eat healthier', 'high protein', 'lose weight', 'bulk/cut', 'reduce takeaways', 'family meals']
const dietaryOptions = ['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'halal', 'low calorie', 'high protein', 'no restrictions']
const applianceOptions = ['stovetop', 'oven', 'air fryer', 'slow cooker', 'microwave']
const blockerOptions = ['too tired', 'too many dishes', 'no ingredients', 'too many steps', 'afraid of messing up', 'not enough time']
const flavourSuffixes = ['garlic-herb', 'sweet-chilli', 'teriyaki', 'mild-taco', 'tomato-basil', 'lemon-pepper']

const modeOptions: Array<{
  id: TonightMode
  label: string
  description: string
  icon: typeof BatteryLow
}> = [
  { id: 'no_energy', label: "I'm tired", description: 'No chopping, little cleanup', icon: BatteryLow },
  { id: 'cook_15', label: "I'm hungry now", description: 'Fastest safe dinner', icon: Zap },
  { id: 'post_gym', label: 'Protein please', description: 'Filling and higher protein', icon: Dumbbell },
]

type CookingSession = {
  recipeId: string
  step: number
  servings: number
  timerSeconds: number
  timerRunning: boolean
  updatedAt: string
}

type NotificationStatus = NotificationPermission | 'unsupported'

const toggleItem = (list: string[], item: string) =>
  list.includes(item) ? list.filter((value) => value !== item) : [...list, item]

const toggleDietary = (list: string[], item: string) => {
  if (item === 'no restrictions') return list.includes(item) ? [] : ['no restrictions']
  const next = toggleItem(list.filter((value) => value !== 'no restrictions'), item)
  return next.length ? next : ['no restrictions']
}

const getRecipeCardLabel = (recipe: Recipe) => {
  if (recipe.tags.includes('fakeaway')) return 'weeknight favourite'
  if (recipe.tags.includes('no energy')) return 'low-effort dinner'
  if (recipe.tags.includes('meal prep')) return 'meal prep'
  if (recipe.timeMinutes <= 15) return '15-minute dinner'
  return 'weeknight dinner'
}

const getRecipeFamilyId = (recipeId: string) => {
  const suffix = flavourSuffixes.find((flavour) => recipeId.endsWith(`-${flavour}`))
  return suffix ? recipeId.slice(0, -(suffix.length + 1)) : recipeId
}

const getRecipeFlavourId = (recipeId: string) =>
  flavourSuffixes.find((flavour) => recipeId.endsWith(`-${flavour}`)) ?? 'core'

const diversifyRecipeFamilies = <T extends { recipe: Recipe }>(items: T[]) => {
  const groups = new Map<string, T[]>()
  const familyOrder: string[] = []
  const firstChoices: T[] = []
  const alternates: T[] = []
  const flavourCounts = new Map<string, number>()

  items.forEach((item) => {
    const familyId = getRecipeFamilyId(item.recipe.id)
    if (!groups.has(familyId)) {
      familyOrder.push(familyId)
      groups.set(familyId, [])
    }
    groups.get(familyId)?.push(item)
  })

  familyOrder.forEach((familyId) => {
    const group = groups.get(familyId) ?? []
    const choice =
      group.find((item) => (flavourCounts.get(getRecipeFlavourId(item.recipe.id)) ?? 0) < 2) ??
      group[0]

    if (!choice) return
    firstChoices.push(choice)
    const flavourId = getRecipeFlavourId(choice.recipe.id)
    flavourCounts.set(flavourId, (flavourCounts.get(flavourId) ?? 0) + 1)
    alternates.push(...group.filter((item) => item.recipe.id !== choice.recipe.id))
  })

  return [...firstChoices, ...alternates]
}

const findTrustedRepeatRecipe = (interactions: RecipeInteraction[]) => {
  const cooked = interactions
    .filter((interaction) => (interaction.cookedCount ?? 0) > 0)
    .sort((a, b) => (Date.parse(b.lastCookedAt ?? '') || 0) - (Date.parse(a.lastCookedAt ?? '') || 0))
  return recipes.find((recipe) => recipe.id === cooked[0]?.recipeId)
}

const getSuggestedTimerSeconds = (instruction: string, activeTimeMinutes: number) => {
  const match = instruction.match(/(?:for|about|another)\s+(\d{1,2})\s*(?:to\s*(\d{1,2})\s*)?(?:min|mins|minute|minutes)/i)
  if (match) {
    const lower = Number(match[1])
    const upper = match[2] ? Number(match[2]) : lower
    return Math.max(30, Math.round(((lower + upper) / 2) * 60))
  }
  return Math.max(60, Math.min(10 * 60, Math.round(Math.max(2, activeTimeMinutes / 3) * 60)))
}

const formatTimer = (seconds: number) => {
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0')
  const secs = Math.floor(seconds % 60).toString().padStart(2, '0')
  return `${mins}:${secs}`
}

const playTimerSound = () => {
  const AudioContextCtor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioContextCtor) return
  const context = new AudioContextCtor()
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  oscillator.type = 'sine'
  oscillator.frequency.value = 880
  gain.gain.setValueAtTime(0.001, context.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.03)
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.8)
  oscillator.connect(gain)
  gain.connect(context.destination)
  oscillator.start()
  oscillator.stop(context.currentTime + 0.85)
}

const showTimerNotification = (recipeTitle: string) => {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  new Notification('Cookr timer finished', {
    body: `${recipeTitle}: check the current step.`,
    icon: `${import.meta.env.BASE_URL}favicon.svg`,
  })
}

const updateInteraction = (
  interactions: RecipeInteraction[],
  recipeId: string,
  patch: Partial<RecipeInteraction>,
) => {
  const existing = interactions.find((interaction) => interaction.recipeId === recipeId)
  if (!existing) return [...interactions, { recipeId, ...patch }]
  return interactions.map((interaction) =>
    interaction.recipeId === recipeId ? { ...interaction, ...patch } : interaction,
  )
}

function Onboarding({
  profile,
  setProfile,
  onFinish,
}: {
  profile: UserProfile
  setProfile: (profile: UserProfile) => void
  onFinish: () => void
}) {
  const completion =
    40 +
    Math.min(20, profile.goals.length * 5) +
    Math.min(20, profile.styles.length * 4) +
    Math.min(20, profile.blockers.length * 5)
  const initialConfidenceRef = useRef(profile.confidence)
  const [householdInput, setHouseholdInput] = useState(String(profile.householdSize))

  const commitHouseholdSize = (value: string) => {
    const parsed = Number(value)
    const nextSize = Number.isFinite(parsed) ? Math.min(8, Math.max(1, Math.round(parsed))) : 1
    setHouseholdInput(String(nextSize))
    setProfile({ ...profile, householdSize: nextSize })
  }

  useEffect(() => {
    trackEvent('onboarding_started', { confidence: initialConfidenceRef.current })
  }, [])

  return (
    <section className="onboarding" aria-labelledby="onboarding-title">
      <div className="panel intro-panel">
        <ChefHat aria-hidden="true" />
        <div>
          <p className="section-label">Cookr setup</p>
          <h1 id="onboarding-title">Make dinner feel possible first</h1>
        </div>
        <p>
          Cookr starts by understanding what usually blocks cooking, then recommends the lowest-friction
          path that still feels like a win.
        </p>
        <div className="progress-track" aria-label={`Onboarding ${completion} percent complete`}>
          <span style={{ width: `${completion}%` }} />
        </div>
        <div className="trust-row">
          <span>NZ measures</span>
          <span>Low-energy modes</span>
          <span>Beginner-safe steps</span>
        </div>
        <p className="setup-note">
          Defaults are already sensible for a tired weeknight. Change only what matters tonight.
        </p>
      </div>

      <div className="panel form-panel">
        <div className="setup-note">
          <BadgeCheck size={18} aria-hidden="true" />
          <span>No account needed. Cookr will make a starter plan as soon as you finish setup.</span>
        </div>
        <fieldset>
          <legend>Cooking confidence</legend>
          <div className="segmented">
            {confidenceOptions.map((option) => (
              <button
                aria-pressed={profile.confidence === option}
                className={profile.confidence === option ? 'selected' : ''}
                key={option}
                onClick={() => setProfile({ ...profile, confidence: option })}
                type="button"
              >
                {option}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>What usually stops you?</legend>
          <div className="chip-grid">
            {blockerOptions.map((option) => (
              <button
                aria-pressed={profile.blockers.includes(option)}
                className={profile.blockers.includes(option) ? 'chip active' : 'chip'}
                key={option}
                onClick={() => setProfile({ ...profile, blockers: toggleItem(profile.blockers, option) })}
                type="button"
              >
                {option}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>Preferred cooking styles</legend>
          <div className="chip-grid">
            {styleOptions.map((option) => (
              <button
                aria-pressed={profile.styles.includes(option)}
                className={profile.styles.includes(option) ? 'chip active' : 'chip'}
                key={option}
                onClick={() => setProfile({ ...profile, styles: toggleItem(profile.styles, option) })}
                type="button"
              >
                {option}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>Goals</legend>
          <div className="chip-grid">
            {goalOptions.map((option) => (
              <button
                aria-pressed={profile.goals.includes(option)}
                className={profile.goals.includes(option) ? 'chip active' : 'chip'}
                key={option}
                onClick={() => setProfile({ ...profile, goals: toggleItem(profile.goals, option) })}
                type="button"
              >
                {option}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="form-grid">
          <label>
            Household size
            <input
              min="1"
              max="8"
              inputMode="numeric"
              type="text"
              value={householdInput}
              onBlur={(event) => commitHouseholdSize(event.target.value)}
              onChange={(event) => {
                const nextValue = event.target.value.replace(/[^\d]/g, '').slice(0, 2)
                setHouseholdInput(nextValue)
                const parsed = Number(nextValue)
                if (nextValue && Number.isFinite(parsed)) {
                  setProfile({ ...profile, householdSize: Math.min(8, Math.max(1, parsed)) })
                }
              }}
            />
          </label>
          <label>
            Budget level
            <select value={profile.budget} onChange={(event) => setProfile({ ...profile, budget: event.target.value as UserProfile['budget'] })}>
              <option value="tight">tight</option>
              <option value="balanced">balanced</option>
              <option value="flexible">flexible</option>
            </select>
          </label>
          <label>
            Time available
            <select value={profile.time} onChange={(event) => setProfile({ ...profile, time: event.target.value as UserProfile['time'] })}>
              <option>under 15 min</option>
              <option>under 30 min</option>
              <option>under 45 min</option>
              <option>batch cook</option>
            </select>
          </label>
          <label>
            Schedule reality
            <select value={profile.scheduleType} onChange={(event) => setProfile({ ...profile, scheduleType: event.target.value as UserProfile['scheduleType'] })}>
              <option value="standard">standard</option>
              <option value="student">student</option>
              <option value="shift_worker">shift worker</option>
              <option value="family">family</option>
              <option value="gym">gym</option>
            </select>
          </label>
        </div>

        <fieldset>
          <legend>Dietary needs</legend>
          <div className="chip-grid">
            {dietaryOptions.map((option) => (
              <button
                aria-pressed={profile.dietaries.includes(option)}
                className={profile.dietaries.includes(option) ? 'chip active' : 'chip'}
                key={option}
                onClick={() => setProfile({ ...profile, dietaries: toggleDietary(profile.dietaries, option) })}
                type="button"
              >
                {option}
              </button>
            ))}
          </div>
        </fieldset>
        <SafetyNote />

        <fieldset>
          <legend>Appliances available</legend>
          <div className="chip-grid">
            {applianceOptions.map((option) => (
              <button
                aria-pressed={profile.appliances.includes(option)}
                className={profile.appliances.includes(option) ? 'chip active' : 'chip'}
                key={option}
                onClick={() => setProfile({ ...profile, appliances: toggleItem(profile.appliances, option) })}
                type="button"
              >
                {option}
              </button>
            ))}
          </div>
        </fieldset>

        <label>
          Disliked ingredients
          <input
            placeholder="e.g. mushrooms, coriander"
            value={profile.dislikes}
            onChange={(event) => setProfile({ ...profile, dislikes: event.target.value })}
          />
        </label>

        <label>
          Use what I already have
          <input
            placeholder="e.g. rice, soy sauce, eggs"
            value={profile.pantryItems}
            onChange={(event) => setProfile({ ...profile, pantryItems: event.target.value })}
          />
        </label>

        <div className="sticky-submit">
          <small>You can edit these choices later from Home.</small>
          <button className="primary-action" type="button" onClick={onFinish}>
            Build my cooking plan <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  )
}

function StatusBanner({ online }: { online: boolean }) {
  if (online) return null

  return (
    <div className="status-banner" role="status">
      <WifiOff size={17} aria-hidden="true" />
      You are offline. Your plan and cooking steps still work on this device.
    </div>
  )
}

function MaintenanceNotice() {
  if (!betaConfig.maintenanceMode) return null

  return (
    <div className="status-banner maintenance-banner" role="status">
      <AlertCircle size={17} aria-hidden="true" />
      Cookr is in a short beta maintenance window. Saved plans still work on this device.
    </div>
  )
}

function ModeSelector({
  mode,
  onModeChange,
}: {
  mode: TonightMode
  onModeChange: (mode: TonightMode) => void
}) {
  const visibleMode = modeOptions.some((option) => option.id === mode) ? mode : 'cook_15'

  return (
    <section className="mode-strip" aria-labelledby="mode-title">
      <div>
        <p className="section-label">Change the vibe</p>
        <h2 id="mode-title">Need a different kind of dinner?</h2>
      </div>
      <div className="mode-grid">
        {modeOptions.map((option) => {
          const Icon = option.icon
          return (
            <button
              key={option.id}
              className={visibleMode === option.id ? 'mode-card active-mode' : 'mode-card'}
              type="button"
              aria-pressed={visibleMode === option.id}
              aria-label={`${option.label}: ${option.description}`}
              onClick={() => onModeChange(option.id)}
            >
              <Icon aria-hidden="true" />
              <span>{option.label}</span>
              <small>{option.description}</small>
            </button>
          )
        })}
      </div>
    </section>
  )
}

function RecipeImage({ recipe, className }: { recipe: Recipe; className?: string }) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div className={className ? `image-fallback ${className}` : 'image-fallback'} role="img" aria-label={`${recipe.title} image unavailable`}>
        <ImageOff size={22} aria-hidden="true" />
        <span>Image saved offline? Recipe still works.</span>
      </div>
    )
  }

  return <img className={className} src={recipe.image} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} />
}

function TonightPickCard({
  recommendation,
  easierFallback,
  onCook,
  onShop,
  onView,
}: {
  recommendation: { recipe: Recipe; reasons: string[] }
  easierFallback?: { recipe: Recipe; reasons: string[] }
  onCook: (recipeId: string) => void
  onShop: (recipeId: string) => void
  onView: (recipeId: string) => void
}) {
  const { recipe, reasons } = recommendation

  return (
    <article className="tonight-pick panel" aria-labelledby="tonight-pick-title">
      <RecipeImage recipe={recipe} />
      <div>
        <p className="section-label">Cookr's pick</p>
        <h2 id="tonight-pick-title">{recipe.title}</h2>
        <p>{reasons.slice(0, 3).join(' - ') || 'Simple, realistic, and ready for tonight.'}</p>
        <div className="detail-stats">
          <span>{recipe.timeMinutes} min</span>
          <span>{recipe.activeTimeMinutes} min active</span>
          <span>${recipe.costEstimateNzd.toFixed(2)}/serve est.</span>
          <span>{recipe.proteinEstimateGrams}g protein</span>
        </div>
        <div className="top-pick-actions">
          <button className="primary-action" type="button" onClick={() => onCook(recipe.id)}>
            <Timer size={18} aria-hidden="true" /> Cook this
          </button>
          <button className="secondary-action" type="button" onClick={() => onShop(recipe.id)}>
            <ShoppingBasket size={18} aria-hidden="true" /> Shop ingredients
          </button>
          <button className="text-action" type="button" onClick={() => onView(recipe.id)}>View recipe</button>
        </div>
        {easierFallback ? (
          <div className="easier-pick">
            <BatteryLow size={17} aria-hidden="true" />
            <span>Need easier? {easierFallback.recipe.title}</span>
            <button type="button" onClick={() => onCook(easierFallback.recipe.id)}>Use easier option</button>
          </div>
        ) : null}
      </div>
    </article>
  )
}

function RecipeCard({
  recipe,
  reasons,
  selected,
  favourite,
  onSelect,
  onOpen,
  onFavourite,
}: {
  recipe: Recipe
  reasons: string[]
  selected: boolean
  favourite: boolean
  onSelect: () => void
  onOpen: () => void
  onFavourite: () => void
}) {
  return (
    <article className={selected ? 'recipe-card selected-card' : 'recipe-card'}>
      <button className="image-button" type="button" onClick={onOpen} aria-label={`View ${recipe.title}`}>
        <RecipeImage recipe={recipe} />
      </button>
      <span className="time-badge">{recipe.timeMinutes} min</span>
      <div className="recipe-body">
        <div className="card-topline">
          <span>{getRecipeCardLabel(recipe)}</span>
          <button
            type="button"
            className={favourite ? 'icon-button saved' : 'icon-button'}
            onClick={(event) => {
              event.stopPropagation()
              onFavourite()
            }}
            aria-label={favourite ? 'Unsave recipe' : 'Save recipe'}
          >
            <Heart size={17} fill={favourite ? 'currentColor' : 'none'} aria-hidden="true" />
          </button>
        </div>
        <h3>{recipe.title}</h3>
        <div className="meta-row">
          <span><Clock3 size={15} aria-hidden="true" /> {recipe.timeMinutes} min</span>
          <span>{recipe.activeTimeMinutes} min active</span>
          <span>${recipe.costEstimateNzd.toFixed(2)}/serve</span>
          <span>{recipe.proteinEstimateGrams}g protein</span>
        </div>
        <p>{reasons.length ? reasons.slice(0, 3).join(' - ') : 'A practical weeknight option'}</p>
        <div className="effort-meter" aria-label={`Effort ${recipe.effortScore} out of 5`}>
          {Array.from({ length: 5 }).map((_, index) => (
            <span className={index < recipe.effortScore ? 'filled' : ''} key={index} />
          ))}
        </div>
        <div className="card-actions">
          <button type="button" onClick={onSelect}>{selected ? 'Remove from plan' : 'Plan this'}</button>
          <button type="button" onClick={onOpen}>View recipe</button>
        </div>
      </div>
    </article>
  )
}

function EmptyState({
  title,
  body,
  action,
}: {
  title: string
  body: string
  action?: { label: string; onClick: () => void }
}) {
  return (
    <section className="empty-state panel">
      <Sparkles aria-hidden="true" />
      <h2>{title}</h2>
      <p>{body}</p>
      {action ? <button className="primary-action" type="button" onClick={action.onClick}>{action.label}</button> : null}
    </section>
  )
}

function SafetyNote() {
  return (
    <div className="safety-note">
      <ShieldCheck size={17} aria-hidden="true" />
      <p>
        Guidance only. Double-check product labels for allergens, dietary or religious suitability, and
        current Woolworths prices before buying or cooking.
      </p>
    </div>
  )
}

function FeedbackStrip({
  recipe,
  onFeedback,
  onDismiss,
}: {
  recipe?: Recipe
  onFeedback: (outcome: RecipeFeedback['outcome']) => void
  onDismiss?: () => void
}) {
  if (!recipe) return null

  return (
    <section className="feedback-strip panel" aria-labelledby="feedback-title">
      <MessageSquare aria-hidden="true" />
      <div>
        <p className="section-label">Beta feedback</p>
        <h2 id="feedback-title">How did {recipe.title} go?</h2>
        <p>One tap improves your next recommendations.</p>
      </div>
      <div className="feedback-actions">
        {[
          ['would_repeat', 'Cook again'],
          ['too_hard', 'Too hard'],
          ['too_expensive', 'Too pricey'],
          ['shopping_issue', 'Shop issue'],
        ].map(([outcome, label]) => (
          <button key={outcome} type="button" onClick={() => onFeedback(outcome as RecipeFeedback['outcome'])}>
            {label}
          </button>
        ))}
        {onDismiss ? (
          <button type="button" className="quiet-action" onClick={onDismiss}>
            Not now
          </button>
        ) : null}
      </div>
    </section>
  )
}

function RecipeVariants({
  variants,
  onOpen,
}: {
  variants: RecipeVariant[]
  onOpen: (recipeId: string) => void
}) {
  if (!variants.length) return null

  return (
    <div className="variant-panel">
      <h3>Swap without restarting</h3>
      <div className="variant-grid">
        {variants.map((variant) => (
          <button type="button" key={`${variant.label}-${variant.recipe.id}`} onClick={() => onOpen(variant.recipe.id)}>
            <span>{variant.label}</span>
            <strong>{variant.recipe.title}</strong>
            <small>{variant.reason}</small>
          </button>
        ))}
      </div>
    </div>
  )
}

function RecipeDetail({
  recipe,
  onCook,
  onAdd,
  isInPlan,
  variants,
  onVariantOpen,
}: {
  recipe: Recipe
  onCook: () => void
  onAdd: () => void
  isInPlan: boolean
  variants: RecipeVariant[]
  onVariantOpen: (recipeId: string) => void
}) {
  return (
    <section className="detail-panel panel" aria-labelledby="recipe-title">
      <RecipeImage recipe={recipe} />
      <div>
        <p className="section-label">{recipe.cuisine}</p>
        <h2 id="recipe-title">{recipe.title}</h2>
        <div className="detail-stats">
          <span>{recipe.timeMinutes} min</span>
          <span>{recipe.activeTimeMinutes} min active</span>
          <span>{recipe.servings} serves</span>
          <span>{recipe.difficulty}</span>
          <span>${recipe.costEstimateNzd.toFixed(2)}/serve est.</span>
        </div>
        <p className="source-note">{recipe.licenseNote}</p>
        <div className="beginner-callout">
          <BadgeCheck aria-hidden="true" />
          <p>{recipe.skillTips[0]}</p>
        </div>
        <SafetyNote />
        <h3>Ingredients</h3>
        <ul className="ingredient-list">
          {recipe.ingredients.map((ingredient) => (
            <li key={`${ingredient.name}-${ingredient.unit}`}>
              <span>{ingredient.name}</span>
              <strong>{ingredient.quantity} {ingredient.unit}</strong>
            </li>
          ))}
        </ul>
        <div className="detail-actions">
          <button className="secondary-action" type="button" onClick={onAdd}>{isInPlan ? 'Remove from plan' : 'Add to plan'}</button>
          <button className="primary-action" type="button" onClick={onCook}>
            Start cooking <Timer size={18} aria-hidden="true" />
          </button>
        </div>
        <RecipeVariants variants={variants} onOpen={onVariantOpen} />
      </div>
    </section>
  )
}

function CookingMode({
  recipe,
  onComplete,
  onTooHard,
}: {
  recipe: Recipe
  onComplete: () => void
  onTooHard: () => void
}) {
  const cookingSessionKey = `cookr.cookingSession.${recipe.id}.v1`
  const firstStepTimer = getSuggestedTimerSeconds(recipe.instructions[0], recipe.activeTimeMinutes)
  const savedSession = useMemo(
    () => readStoredValue<CookingSession>(cookingSessionKey, {
      recipeId: recipe.id,
      step: 0,
      servings: recipe.servings,
      timerSeconds: firstStepTimer,
      timerRunning: false,
      updatedAt: '',
    }),
    [cookingSessionKey, firstStepTimer, recipe.id, recipe.servings],
  )
  const initialStep = Math.min(Math.max(savedSession.step ?? 0, 0), recipe.instructions.length - 1)
  const [step, setStep] = useState(initialStep)
  const [servings, setServings] = useState(Math.min(10, Math.max(1, savedSession.servings || recipe.servings)))
  const suggestedTimerSeconds = useMemo(
    () => getSuggestedTimerSeconds(recipe.instructions[step], recipe.activeTimeMinutes),
    [recipe.activeTimeMinutes, recipe.instructions, step],
  )
  const [timerSeconds, setTimerSeconds] = useState(savedSession.timerSeconds || suggestedTimerSeconds)
  const [timerRunning, setTimerRunning] = useState(Boolean(savedSession.timerRunning))
  const [timerFinished, setTimerFinished] = useState((savedSession.timerSeconds ?? suggestedTimerSeconds) <= 0)
  const [notificationStatus, setNotificationStatus] = useState<NotificationStatus>(() =>
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported',
  )
  const scale = servings / recipe.servings
  const finalStep = step === recipe.instructions.length - 1
  const resumedSession = Boolean(savedSession.updatedAt && (initialStep > 0 || savedSession.timerSeconds !== firstStepTimer))
  const timerHelperCopy = timerFinished
    ? 'Check the pan before moving on.'
    : notificationStatus === 'denied'
      ? 'Notifications are blocked; keep this screen open for the sound.'
      : notificationStatus === 'unsupported'
        ? 'Keep this screen open for the timer sound.'
        : 'Cookr will play a sound and can notify you when it finishes.'

  useEffect(() => {
    if (!timerRunning) return undefined
    const interval = window.setInterval(() => {
      setTimerSeconds((seconds) => {
        if (seconds <= 1) {
          window.clearInterval(interval)
          setTimerRunning(false)
          setTimerFinished(true)
          playTimerSound()
          showTimerNotification(recipe.title)
          trackEvent('cooking_timer_finished', { recipeId: recipe.id, step: step + 1 })
          return 0
        }
        return seconds - 1
      })
    }, 1000)
    return () => window.clearInterval(interval)
  }, [recipe.id, recipe.title, step, timerRunning])

  useEffect(() => {
    writeStoredValue<CookingSession>(cookingSessionKey, {
      recipeId: recipe.id,
      step,
      servings,
      timerSeconds,
      timerRunning,
      updatedAt: new Date().toISOString(),
    })
  }, [cookingSessionKey, recipe.id, servings, step, timerRunning, timerSeconds])

  const startTimer = () => {
    if ('Notification' in window && Notification.permission === 'default') {
      void Notification.requestPermission().then((permission) => {
        setNotificationStatus(permission)
        if (permission === 'denied') trackEvent('cooking_timer_notifications_blocked', { recipeId: recipe.id })
      })
    } else if ('Notification' in window) {
      setNotificationStatus(Notification.permission)
    }
    setTimerFinished(false)
    setTimerSeconds((seconds) => (seconds > 0 ? seconds : suggestedTimerSeconds))
    setTimerRunning(true)
    trackEvent('cooking_timer_started', { recipeId: recipe.id, step: step + 1, seconds: timerSeconds || suggestedTimerSeconds })
  }

  const adjustTimer = (deltaSeconds: number) => {
    setTimerFinished(false)
    setTimerSeconds((seconds) => Math.max(30, Math.min(60 * 60, seconds + deltaSeconds)))
  }

  const moveToStep = (nextStep: number) => {
    setStep(nextStep)
    setTimerRunning(false)
    setTimerFinished(false)
    setTimerSeconds(getSuggestedTimerSeconds(recipe.instructions[nextStep], recipe.activeTimeMinutes))
  }

  return (
    <section className="cooking-mode panel" aria-labelledby="cooking-title">
      <div className="cooking-header">
        <div>
          <p className="section-label">Cooking mode</p>
          <h2 id="cooking-title">{recipe.title}</h2>
        </div>
        <label className="serving-stepper">
          Serves
          <input
            min="1"
            max="10"
            value={servings}
            inputMode="numeric"
            type="number"
            onChange={(event) => setServings(Math.min(10, Math.max(1, Number(event.target.value) || 1)))}
          />
        </label>
      </div>

      {resumedSession ? (
        <div className="trust-state" role="status">
          <RotateCcw size={17} aria-hidden="true" />
          Resumed where you left off. Use Reset if you want to restart this step.
        </div>
      ) : null}

      <div className="prep-checklist">
        <h3>Get this out first</h3>
        {recipe.ingredients.slice(0, 5).map((ingredient) => (
          <label key={ingredient.name}>
            <input type="checkbox" /> {Math.ceil(ingredient.quantity * scale * 10) / 10} {ingredient.unit} {ingredient.name}
          </label>
        ))}
      </div>

      <div className="step-card" aria-live="polite">
        <span className="step-count">Step {step + 1} of {recipe.instructions.length}</span>
        <p>{recipe.instructions[step]}</p>
        <div className="step-actions">
          <button type="button" disabled={step === 0} onClick={() => moveToStep(Math.max(0, step - 1))}>Previous</button>
          <button
            type="button"
            onClick={() => (finalStep ? onComplete() : moveToStep(Math.min(recipe.instructions.length - 1, step + 1)))}
          >
            {finalStep ? 'Mark cooked' : 'Next step'}
          </button>
        </div>
        <div className="visual-cue">
          <strong>What should this look like?</strong>
          <span>{recipe.visualCues[step % recipe.visualCues.length]}</span>
        </div>
        <div className="timer-strip">
          <div>
            <Timer size={18} aria-hidden="true" />
            <strong>{timerFinished ? 'Timer done' : 'Step timer'}</strong>
            <span>{timerHelperCopy}</span>
          </div>
          <div className="timer-controls" aria-label="Step timer controls">
            <button type="button" onClick={() => adjustTimer(-60)} aria-label="Remove one minute">
              <Minus size={17} aria-hidden="true" />
            </button>
            <output aria-live="polite">{formatTimer(timerSeconds)}</output>
            <button type="button" onClick={() => adjustTimer(60)} aria-label="Add one minute">
              <Plus size={17} aria-hidden="true" />
            </button>
            <button type="button" className="timer-play" onClick={timerRunning ? () => setTimerRunning(false) : startTimer}>
              {timerRunning ? <Pause size={17} aria-hidden="true" /> : <Play size={17} aria-hidden="true" />}
              {timerRunning ? 'Pause' : 'Start'}
            </button>
            <button
              type="button"
              onClick={() => {
                setTimerRunning(false)
                setTimerFinished(false)
                setTimerSeconds(suggestedTimerSeconds)
              }}
            >
              <RotateCcw size={16} aria-hidden="true" /> Reset
            </button>
          </div>
        </div>
      </div>

      <div className="help-grid">
        <div>
          <h3>What does this mean?</h3>
          {Object.entries(cookingTerms).slice(0, 4).map(([term, explanation]) => (
            <details key={term}>
              <summary>{term}</summary>
              <p>{explanation}</p>
            </details>
          ))}
        </div>
        <div>
          <h3>Panic help</h3>
          <button className="panic-action" type="button" onClick={onTooHard}>
            <AlertCircle size={16} aria-hidden="true" /> This feels too hard
          </button>
          {panicHelp.map((tip) => (
            <p className="panic-tip" key={tip}><AlertCircle size={15} aria-hidden="true" /> {tip}</p>
          ))}
        </div>
      </div>
    </section>
  )
}

function ShoppingList({
  selectedRecipes,
  profile,
  onFindRecipes,
  onCook,
}: {
  selectedRecipes: Recipe[]
  profile: UserProfile
  onFindRecipes: () => void
  onCook: (recipeId: string) => void
}) {
  const online = useOnlineStatus()
  const [checked, setChecked] = useStoredState<Record<string, boolean>>('cookr.grocery.checked.v1', {})
  const baseLines = useMemo(() => buildGroceryList(selectedRecipes, profile.pantryItems), [selectedRecipes, profile.pantryItems])
  const lines = baseLines.map((line) => ({ ...line, checked: checked[line.name] ?? line.checked }))
  const total = estimateBasketTotal(lines)
  const confidence = getBasketPriceConfidence(lines)
  const lowConfidenceCount = lines.filter((line) => line.match.confidence === 'low').length
  const groupedLines = lines.reduce<Record<string, typeof lines>>((groups, line) => {
    groups[line.category] = groups[line.category] ? [...groups[line.category], line] : [line]
    return groups
  }, {})

  useEffect(() => {
    if (selectedRecipes.length) trackEvent('grocery_list_created', { recipeCount: selectedRecipes.length, lineCount: lines.length })
  }, [selectedRecipes.length, lines.length])

  if (!selectedRecipes.length) {
    return (
      <EmptyState
        title="No meals in your plan yet"
        body="Add one or two realistic dinners first. Cookr will build the smallest useful shop from there."
        action={{ label: 'Find recipes', onClick: onFindRecipes }}
      />
    )
  }

  return (
    <section className="shopping panel" aria-labelledby="shopping-title">
      <div className="section-heading">
        <div>
          <p className="section-label">Woolworths assistant</p>
          <h2 id="shopping-title">Grocery list</h2>
        </div>
        <div className="shopping-summary">
          <strong>${total.toFixed(2)} est.</strong>
          <button
            className="secondary-action"
            type="button"
            onClick={() => {
              trackEvent('shopping_to_cook_clicked', { recipeId: selectedRecipes[0].id })
              onCook(selectedRecipes[0].id)
            }}
          >
            Cook first meal
          </button>
        </div>
      </div>
      <p className="source-note">
        Links open user-controlled Woolworths NZ searches. Prices are estimates; Cookr does not scrape result
        pages or automate checkout.
      </p>
      {!online ? (
        <div className="trust-state" role="status">
          <WifiOff size={17} aria-hidden="true" />
          You are offline. This list is saved here, but Woolworths links need internet.
        </div>
      ) : null}
      <div className="price-confidence">
        <PackageCheck aria-hidden="true" />
        <div>
          <strong>{confidence.label}</strong>
          <span>{confidence.copy}</span>
        </div>
        <small>{confidence.high} high / {confidence.medium} medium / {confidence.low} low</small>
      </div>
      {lowConfidenceCount ? (
        <div className="trust-state">
          <AlertCircle size={17} aria-hidden="true" />
          {lowConfidenceCount} item{lowConfidenceCount === 1 ? '' : 's'} need manual checking. Open the Woolworths search and choose the pack that suits your budget and diet.
        </div>
      ) : null}
      <div className="grocery-list">
        {Object.entries(groupedLines).map(([category, categoryLines]) => (
          <section className="aisle-group" key={category} aria-label={category}>
            <h3>{category}</h3>
            {categoryLines.map((line) => (
              <div className={line.checked ? 'grocery-row checked' : 'grocery-row'} key={`${line.name}-${line.normalizedUnit}`}>
                <label>
                  <input
                    type="checkbox"
                    checked={line.checked}
                    onChange={() => setChecked((current) => ({ ...current, [line.name]: !line.checked }))}
                  />
                  <span>
                    <strong>{line.name}</strong>
                    <small>{line.displayQuantity} - {line.confidenceNote}{line.pantry ? ' - pantry' : ''}</small>
                  </span>
                </label>
                <a href={line.match.searchUrl} target="_blank" rel="noreferrer" onClick={() => trackEvent('product_link_opened', { ingredient: line.name, confidence: line.match.confidence })}>
                  {line.match.name}
                  <small>{line.match.size} - {line.match.confidence} match</small>
                  {line.match.confidence === 'low' ? <small>No curated match yet. Choose manually.</small> : null}
                </a>
              </div>
            ))}
          </section>
        ))}
      </div>
    </section>
  )
}

function InstallPromptCard() {
  const { canInstall, installed, promptInstall } = useInstallPrompt()
  const installPromptTrackedRef = useRef(false)

  useEffect(() => {
    if (!canInstall || installPromptTrackedRef.current) return
    installPromptTrackedRef.current = true
    trackEvent('install_prompt_available', { installed })
  }, [canInstall, installed])

  return (
    <section className="panel install-card">
      <PackageCheck aria-hidden="true" />
      <div>
        <p className="section-label">PWA readiness</p>
        <h2>{installed ? 'Installed on this device' : 'Keep Cookr one tap away'}</h2>
        <p>
          Offline recipe steps, saved plans, and grocery lists are cached locally. Install support depends
          on the browser and platform.
        </p>
      </div>
      <button
        className="secondary-action"
        type="button"
        disabled={!canInstall || installed}
        onClick={() => {
          void promptInstall().then((outcome) => trackEvent('pwa_install_prompt_completed', { outcome }))
        }}
      >
        {installed ? 'Installed' : canInstall ? 'Install app' : 'Install from browser'}
      </button>
    </section>
  )
}

function AccountPanel({
  account,
  setAccount,
}: {
  account: AccountState
  setAccount: (account: AccountState) => void
}) {
  const [email, setEmail] = useState(account.email)
  const [loading, setLoading] = useState(false)
  const cloudSyncAvailable = isCloudSyncAvailable()

  const handleSyncRequest = async () => {
    setLoading(true)
    const nextAccount = await requestMagicLink(email.trim())
    setAccount(nextAccount)
    setLoading(false)
  }

  return (
    <section className="panel account-panel" aria-labelledby="account-title">
      <Cloud aria-hidden="true" />
      <div>
        <p className="section-label">Private beta account</p>
        <h2 id="account-title">Back up your plan</h2>
        <p>{account.message}</p>
      </div>
      <label>
        Email
        <input
          value={email}
          placeholder="you@example.co.nz"
          autoComplete="email"
          inputMode="email"
          type="email"
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>
      <div className="inline-actions">
        <button className="secondary-action" type="button" disabled={!email.trim() || loading} onClick={() => void handleSyncRequest()}>
          {loading ? 'Checking...' : cloudSyncAvailable ? 'Send sign-in link' : 'Save email locally'}
        </button>
        <button
          className="secondary-action"
          type="button"
          onClick={() => {
            setAccount(markLocalSyncSnapshot(account))
            trackEvent('local_sync_snapshot_marked', { enabled: account.syncEnabled })
          }}
        >
          Save checkpoint
        </button>
      </div>
      <small>
        Status: {account.syncEnabled ? account.status : 'saved on this device'}
        {account.lastSyncAt ? ` - ${new Date(account.lastSyncAt).toLocaleDateString()}` : ''}
      </small>
    </section>
  )
}

function AnalyticsDashboard({ feedbackCount }: { feedbackCount: number }) {
  const summary = getAnalyticsSummary(getAnalyticsEvents())

  return (
    <section className="panel analytics-panel" aria-labelledby="analytics-title">
      <BarChart3 aria-hidden="true" />
      <div>
        <p className="section-label">Beta analytics</p>
        <h2 id="analytics-title">Drop-off signals on this device</h2>
      </div>
      {summary.totalEvents ? (
        <div className="metric-grid">
          <span><strong>{summary.onboardingCompleted}</strong> onboarded</span>
          <span><strong>{summary.recipeViews}</strong> views</span>
          <span><strong>{summary.cookingStarted}</strong> cook starts</span>
          <span><strong>{summary.recipesCooked}</strong> completed</span>
          <span><strong>{summary.conversion.cookCompletionRate}%</strong> cook completion</span>
          <span><strong>{summary.listsCreated}</strong> lists</span>
          <span><strong>{summary.productClicks}</strong> product clicks</span>
          <span><strong>{summary.repeatRecipeCooks}</strong> repeats</span>
          <span><strong>{summary.dropOffEvents}</strong> risk signals</span>
          <span><strong>{feedbackCount}</strong> feedback</span>
        </div>
      ) : (
        <div className="empty-analytics">
          <strong>No beta signals yet</strong>
          <span>Use Cookr once and this panel will show local funnel health.</span>
        </div>
      )}
      <p className="source-note">
        Beta analytics stay on this device unless a consented production analytics service is configured.
      </p>
    </section>
  )
}

function BetaFeedbackPanel({
  view,
  reports,
  setReports,
}: {
  view: string
  reports: BetaIssueReport[]
  setReports: (reports: BetaIssueReport[]) => void
}) {
  const [type, setType] = useState<BetaIssueReport['type']>('confusing')
  const [note, setNote] = useState('')
  const [saved, setSaved] = useState(false)

  if (!betaConfig.feedbackEnabled) return null

  const submitReport = () => {
    const trimmedNote = note.trim()
    const report: BetaIssueReport = {
      id: window.crypto?.randomUUID?.() ?? `${Date.now()}`,
      type,
      view,
      note: trimmedNote,
      occurredAt: new Date().toISOString(),
    }
    setReports([...reports.slice(-24), report])
    setSaved(true)
    setNote('')
    trackEvent('beta_issue_reported', {
      type,
      view,
      noteLength: trimmedNote.length,
    })
  }

  return (
    <section className="panel beta-feedback" aria-labelledby="beta-feedback-title">
      <MessageSquare aria-hidden="true" />
      <div>
        <p className="section-label">Beta feedback</p>
        <h2 id="beta-feedback-title">What felt harder than it should?</h2>
        <p>Saved on this device for beta review. Avoid personal, medical, or allergy details.</p>
      </div>
      <label>
        Issue type
        <select value={type} onChange={(event) => setType(event.target.value as BetaIssueReport['type'])}>
          <option value="confusing">Confusing UX</option>
          <option value="recipe_issue">Recipe concern</option>
          <option value="grocery_issue">Grocery issue</option>
          <option value="bug">Bug</option>
          <option value="other">Other</option>
        </select>
      </label>
      <label>
        Short note
        <textarea
          value={note}
          maxLength={500}
          placeholder="e.g. I could not tell what to do after shopping"
          onChange={(event) => {
            setSaved(false)
            setNote(event.target.value)
          }}
        />
      </label>
      <button className="secondary-action" type="button" onClick={submitReport}>
        Save beta note
      </button>
      <small>{saved ? 'Saved locally. Thank you.' : `${reports.length} notes saved on this device.`}</small>
    </section>
  )
}

function GettingStartedCard({
  selectedCount,
  cookedMeals,
  onNext,
}: {
  selectedCount: number
  cookedMeals: number
  onNext: () => void
}) {
  const completedSteps = Math.min(5, 1 + (selectedCount > 0 ? 1 : 0) + (cookedMeals > 0 ? 1 : 0))
  const nextStep = selectedCount === 0
    ? {
      title: 'Shop one dinner',
      body: "We'll add the pick above and make the smallest useful list.",
    }
    : cookedMeals === 0
      ? {
        title: 'Start cooking',
        body: 'Open one-step cooking mode and follow the timer prompts.',
      }
      : {
        title: 'Reset the week',
        body: 'Choose what repeats and what should change next shop.',
      }

  return (
    <button className="getting-started-card" type="button" onClick={onNext}>
      <div>
        <strong>Your next step</strong>
        <span>{completedSteps} of 5 steps</span>
      </div>
      <div className="mini-progress" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, index) => (
          <span className={index < completedSteps ? 'done' : ''} key={index} />
        ))}
      </div>
      <div>
        <strong>{nextStep.title}</strong>
        <small>{nextStep.body}</small>
      </div>
      <ChevronRight size={18} aria-hidden="true" />
    </button>
  )
}

function WoolworthsAssistCard({ onOpen }: { onOpen: () => void }) {
  return (
    <button className="woolworths-card panel" type="button" onClick={onOpen}>
      <span aria-hidden="true">w</span>
      <div>
        <strong>Woolworths assistant</strong>
        <small>Add ingredients to your list and shop smarter.</small>
      </div>
      <ChevronRight size={18} aria-hidden="true" />
    </button>
  )
}

function HomeWeekStrip({
  weeklyPlan,
  onOpen,
}: {
  weeklyPlan: WeeklyPlanSlot[]
  onOpen: (recipeId: string) => void
}) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const meals = days.map((day, index) => ({
    day,
    slot: weeklyPlan[index % Math.max(1, weeklyPlan.length)],
  }))

  if (!weeklyPlan.length) return null

  return (
    <section className="home-week" aria-labelledby="home-week-title">
      <div className="section-heading">
        <h2 id="home-week-title">This week</h2>
        <button className="text-action" type="button" onClick={() => onOpen(weeklyPlan[0].recipe.id)}>
          Edit plan
        </button>
      </div>
      <div className="week-strip">
        {meals.map(({ day, slot }, index) => (
          <button
            type="button"
            className={index === 0 ? 'day-pill active' : 'day-pill'}
            key={day}
            onClick={() => onOpen(slot.recipe.id)}
          >
            <span>{day}{index === 0 ? ' Tonight' : ''}</span>
            <RecipeImage recipe={slot.recipe} />
          </button>
        ))}
      </div>
    </section>
  )
}

function WeeklyPlanner({
  weeklyPlan,
  pantryBundle,
  selectedIds,
  onAddRecipe,
  onAddWeek,
  onCook,
  onOpen,
}: {
  weeklyPlan: WeeklyPlanSlot[]
  pantryBundle: StarterPantryItem[]
  selectedIds: string[]
  onAddRecipe: (recipeId: string) => void
  onAddWeek: () => void
  onCook: (recipeId: string) => void
  onOpen: (recipeId: string) => void
}) {
  return (
    <section className="planner-layout" aria-labelledby="planner-title">
      <div className="panel planner-main">
        <div className="section-heading">
          <div>
            <p className="section-label">Weekly rotation</p>
            <h1 id="planner-title">A week that reuses ingredients</h1>
          </div>
          <button className="primary-action" type="button" onClick={onAddWeek}>
            <Plus size={17} aria-hidden="true" /> Add week
          </button>
        </div>
        <div className="week-grid">
          {weeklyPlan.map((slot) => (
            <article className="week-card" key={slot.id}>
              <span>{slot.label}</span>
              <h2>{slot.recipe.title}</h2>
              <p>{slot.reason}</p>
              <small>{slot.recipe.timeMinutes} min - ${slot.recipe.costEstimateNzd.toFixed(2)}/serve - {slot.recipe.proteinEstimateGrams}g protein</small>
              <div className="inline-actions">
                <button type="button" onClick={() => onAddRecipe(slot.recipe.id)}>
                  {selectedIds.includes(slot.recipe.id) ? 'Remove' : 'Add'}
                </button>
                <button type="button" onClick={() => onOpen(slot.recipe.id)}>View</button>
                <button type="button" onClick={() => onCook(slot.recipe.id)}>Cook</button>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="panel pantry-panel">
        <ShoppingBasket aria-hidden="true" />
        <p className="section-label">Starter pantry</p>
        <h2>First shop bundle</h2>
        <p>For users starting with almost nothing, these unlock the most Cookr meals for the least decision load.</p>
        <div className="pantry-list">
          {pantryBundle.map((item) => (
            <a key={item.key} href={item.match.searchUrl} target="_blank" rel="noreferrer" onClick={() => trackEvent('starter_pantry_link_opened', { item: item.key })}>
              <strong>{item.name}</strong>
              <span>{item.why}</span>
            </a>
          ))}
        </div>
        <SafetyNote />
      </div>
    </section>
  )
}

function App() {
  const online = useOnlineStatus()
  const [profile, setProfile] = useStoredState<UserProfile>('cookr.profile.v2', defaultProfile)
  const [onboarded, setOnboarded] = useStoredState('cookr.onboarded.v1', false)
  const [activeFilters, setActiveFilters] = useStoredState<string[]>('cookr.filters.v1', [])
  const [selectedIds, setSelectedIds] = useStoredState<string[]>('cookr.plan.v1', ['butter-chicken-traybake', 'no-cook-tuna-sushi-bowls'])
  const [favourites, setFavourites] = useStoredState<string[]>('cookr.favourites.v1', ['veggie-pizza-pita'])
  const [interactions, setInteractions] = useStoredState<RecipeInteraction[]>('cookr.interactions.v1', [])
  const [feedback, setFeedback] = useStoredState<RecipeFeedback[]>('cookr.feedback.v1', [])
  const [betaReports, setBetaReports] = useStoredState<BetaIssueReport[]>('cookr.betaReports.v1', [])
  const [account, setAccount] = useStoredState<AccountState>('cookr.account.v1', defaultAccountState)
  const [recentCookedRecipeId, setRecentCookedRecipeId] = useStoredState<string | null>('cookr.recentCookedRecipe.v1', null)
  const [activeRecipeId, setActiveRecipeId] = useStoredState('cookr.activeRecipe.v1', recipes[0].id)
  const [view, setView] = useStoredState<'home' | 'plan' | 'shopping' | 'cook' | 'learn'>('cookr.view.v1', 'home')
  const [mode, setMode] = useStoredState<TonightMode>('cookr.mode.v1', 'cook_15')
  const [searchTerm, setSearchTerm] = useState('')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [visibleRecipeCount, setVisibleRecipeCount] = useState(12)
  const previousViewRef = useRef(view)
  const cookingCompletedRef = useRef(false)
  const lastTrackedSearchRef = useRef('')
  const initialSessionRef = useRef({ view, onboarded })
  const detailRef = useRef<HTMLDivElement | null>(null)
  const deferredSearch = useDeferredValue(searchTerm)

  const context = useMemo(
    () => makeRecommendationContext(profile, { mode, energyLevel: profile.energyLevel, interactions }),
    [profile, mode, interactions],
  )
  const ranked = useMemo(() => filterRecipes(activeFilters, profile, context), [activeFilters, profile, context])
  const searchedRecipes = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase()
    if (!query) return diversifyRecipeFamilies(ranked)
    return diversifyRecipeFamilies(ranked.filter(({ recipe }) =>
      [recipe.title, recipe.cuisine, recipe.takeawayReplacement, recipe.tags.join(' '), recipe.ingredients.map((item) => item.name).join(' ')]
        .join(' ')
        .toLowerCase()
        .includes(query),
    ))
  }, [deferredSearch, ranked])
  const recommendations = useMemo(() => getRankedRecipes(profile, context), [profile, context])
  const selectedRecipes = useMemo(
    () => recipes.filter((recipe) => selectedIds.includes(recipe.id) && recipeMeetsHardConstraints(recipe, profile)),
    [selectedIds, profile],
  )
  const safeFallbackRecipe = recipes.find((recipe) => recipeMeetsHardConstraints(recipe, profile))
  const topRecommendation = recommendations[0] ?? (safeFallbackRecipe ? {
    recipe: safeFallbackRecipe,
    score: 0,
    reasons: ['closest safe fallback while the catalogue grows'],
  } : null)
  const activeRecipe =
    recipes.find((recipe) => recipe.id === activeRecipeId && recipeMeetsHardConstraints(recipe, profile)) ??
    topRecommendation?.recipe ??
    recipes[0]
  const easierFallback = topRecommendation
    ? recommendations.find(({ recipe }) => recipe.effortScore <= 1 && recipe.id !== topRecommendation.recipe.id)
    : undefined
  const weeklyPlan = useMemo(() => buildWeeklyPlan(recommendations, profile, interactions), [recommendations, profile, interactions])
  const pantryBundle = useMemo(() => getStarterPantryBundle(profile), [profile])
  const activeRecipeVariants = useMemo(() => getRecipeVariants(activeRecipe, profile), [activeRecipe, profile])
  const recentCookedRecipe = recentCookedRecipeId ? recipes.find((recipe) => recipe.id === recentCookedRecipeId) : undefined
  const visibleSearchedRecipes = searchedRecipes.slice(0, visibleRecipeCount)
  const overlapScore = getIngredientOverlapScore(selectedRecipes)
  const cookedMeals = interactions.reduce((sum, interaction) => sum + (interaction.cookedCount ?? 0), 0)
  const repeatRecipe = findTrustedRepeatRecipe(interactions)

  useEffect(() => {
    trackEvent('session_started', initialSessionRef.current)
    return () => trackEvent('session_completed', { view: previousViewRef.current })
  }, [])

  useEffect(() => {
    if (previousViewRef.current === view) return
    if (previousViewRef.current === 'cook' && !cookingCompletedRef.current) {
      trackEvent('cooking_session_exited', { nextView: view, recipeId: activeRecipe.id })
    }
    cookingCompletedRef.current = false
    previousViewRef.current = view
    trackEvent('view_opened', { view })
    if (view === 'plan') trackEvent('weekly_planner_viewed', { selectedCount: selectedIds.length })
  }, [activeRecipe.id, selectedIds.length, view])

  useEffect(() => {
    const query = deferredSearch.trim()
    if (query.length < 2 || query === lastTrackedSearchRef.current) return
    lastTrackedSearchRef.current = query
    trackEvent('recipe_search_used', {
      queryLength: query.length,
      resultCount: searchedRecipes.length,
    })
  }, [deferredSearch, searchedRecipes.length])

  useEffect(() => {
    if (!searchedRecipes.length && (activeFilters.length || deferredSearch.trim())) {
      trackEvent('empty_results_seen', { filterCount: activeFilters.length, hasSearch: Boolean(deferredSearch.trim()) })
    }
  }, [activeFilters.length, deferredSearch, searchedRecipes.length])

  const handleFinishOnboarding = () => {
    const starterEnergyLevel = profile.blockers.includes('too tired') || profile.time === 'under 15 min' ? 2 : 3
    const starterContext = makeRecommendationContext(profile, {
      mode: starterEnergyLevel <= 2 ? 'no_energy' : 'cook_15',
      energyLevel: starterEnergyLevel,
      interactions,
    })
    const starterIds = getRankedRecipes(profile, starterContext)
      .slice(0, 2)
      .map(({ recipe }) => recipe.id)
    setSelectedIds(starterIds)
    setActiveRecipeId(starterIds[0] ?? recipes[0].id)
    setActiveFilters([])
    setMode(starterContext.mode)
    setProfile({ ...profile, energyLevel: starterEnergyLevel })
    setOnboarded(true)
    trackEvent('onboarding_completed', {
      confidence: profile.confidence,
      blockers: profile.blockers.length,
      dietaries: profile.dietaries.length,
      appliances: profile.appliances.length,
      starterMode: starterContext.mode,
    })
  }

  const openRecipe = (recipeId: string) => {
    setActiveRecipeId(recipeId)
    setView('home')
    window.setTimeout(() => {
      detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
    trackEvent('recipe_detail_opened', { recipeId })
  }

  const togglePlanRecipe = (recipeId: string) => {
    setSelectedIds(toggleItem(selectedIds, recipeId))
    trackEvent(selectedIds.includes(recipeId) ? 'recipe_removed_from_plan' : 'recipe_added_to_plan', { recipeId })
  }

  const shopRecipe = (recipeId: string) => {
    if (!selectedIds.includes(recipeId)) setSelectedIds([...selectedIds, recipeId])
    setView('shopping')
    trackEvent('shop_single_recipe_clicked', { recipeId, alreadyPlanned: selectedIds.includes(recipeId) })
  }

  const addWeeklyPlan = () => {
    const weekIds = weeklyPlan.map((slot) => slot.recipe.id)
    const nextIds = Array.from(new Set([...selectedIds, ...weekIds]))
    setSelectedIds(nextIds)
    setView('shopping')
    trackEvent('weekly_plan_added', { recipeCount: weekIds.length, addedCount: nextIds.length - selectedIds.length })
  }

  const addRecipeFeedback = (recipeId: string, outcome: RecipeFeedback['outcome']) => {
    setFeedback([...feedback.slice(-99), { recipeId, outcome, occurredAt: new Date().toISOString() }])
    if (outcome === 'would_repeat') {
      setInteractions(updateInteraction(interactions, recipeId, { wouldRepeat: true }))
    }
    trackEvent('recipe_feedback_added', { recipeId, outcome })
  }

  const handleStartCooking = (recipeId = activeRecipe.id) => {
    const current = interactions.find((interaction) => interaction.recipeId === recipeId)
    trackEvent('cook_now_clicked', {
      recipeId,
      mode,
      repeat: Boolean(current?.cookedCount),
      selectedCount: selectedIds.length,
    })
    setActiveRecipeId(recipeId)
    window.setTimeout(() => {
      setView('cook')
      trackEvent('cooking_started', { recipeId, mode })
    }, 180)
  }

  const handleCooked = () => {
    const current = interactions.find((interaction) => interaction.recipeId === activeRecipe.id)
    const repeat = Boolean(current?.cookedCount)
    setInteractions(updateInteraction(interactions, activeRecipe.id, {
      cookedCount: (current?.cookedCount ?? 0) + 1,
      lastCookedAt: new Date().toISOString(),
      wouldRepeat: true,
    }))
    setRecentCookedRecipeId(activeRecipe.id)
    cookingCompletedRef.current = true
    writeStoredValue<CookingSession>(`cookr.cookingSession.${activeRecipe.id}.v1`, {
      recipeId: activeRecipe.id,
      step: 0,
      servings: activeRecipe.servings,
      timerSeconds: getSuggestedTimerSeconds(activeRecipe.instructions[0], activeRecipe.activeTimeMinutes),
      timerRunning: false,
      updatedAt: '',
    })
    trackEvent('cooking_completed', { recipeId: activeRecipe.id, repeat })
    if (repeat) trackEvent('repeat_recipe_cooked', { recipeId: activeRecipe.id })
    setView('home')
  }

  const handleTooHard = () => {
    const current = interactions.find((interaction) => interaction.recipeId === activeRecipe.id)
    setInteractions(updateInteraction(interactions, activeRecipe.id, {
      tooHardCount: (current?.tooHardCount ?? 0) + 1,
    }))
    addRecipeFeedback(activeRecipe.id, 'too_hard')
    trackEvent('recipe_marked_too_hard', { recipeId: activeRecipe.id })
    if (easierFallback) {
      setActiveRecipeId(easierFallback.recipe.id)
      setView('home')
    }
  }

  if (!onboarded) {
    return <Onboarding profile={profile} setProfile={setProfile} onFinish={handleFinishOnboarding} />
  }

  return (
    <div className={view === 'cook' ? 'app-shell cooking-shell' : 'app-shell'}>
      <StatusBanner online={online} />
      <MaintenanceNotice />
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Cookr home" onClick={() => setView('home')}>
          <ChefHat aria-hidden="true" /> Cookr
        </a>
        <nav aria-label="Primary">
          {[
            { id: 'home', label: 'Home', icon: ChefHat },
            { id: 'plan', label: 'Plan', icon: CalendarDays },
            { id: 'cook', label: 'Cook', icon: Timer },
            { id: 'shopping', label: 'List', icon: ShoppingBasket },
            { id: 'learn', label: 'Learn', icon: BookOpen },
          ].map(({ id, label, icon: Icon }) => (
            <button className={view === id ? 'active-nav' : ''} type="button" key={id} onClick={() => setView(id as typeof view)}>
              <Icon size={18} aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <button className="icon-button" type="button" aria-label="Dark mode follows your device">
          <Moon size={18} aria-hidden="true" />
        </button>
      </header>

      <main id="top">
        {view === 'home' && (
          <>
            <section className="hero-band">
              <div>
                <h1>
                  {topRecommendation
                    ? 'Tonight, without the takeaway'
                    : 'Your setup needs one more option'}
                </h1>
                {topRecommendation ? (
                  <p>
                    One realistic pick first. Browse only if you want to.
                  </p>
                ) : (
                  <p>
                    No recipe matches your dietary needs and available appliances yet. Edit setup or add one
                    appliance so Cookr can make a realistic plan.
                  </p>
                )}
                {topRecommendation ? (
                  <TonightPickCard
                    recommendation={topRecommendation}
                    easierFallback={easierFallback}
                    onCook={handleStartCooking}
                    onShop={shopRecipe}
                    onView={openRecipe}
                  />
                ) : (
                  <div className="hero-actions">
                    <button className="primary-action" type="button" onClick={() => setOnboarded(false)}>
                      Edit setup
                    </button>
                  </div>
                )}
                <GettingStartedCard
                  selectedCount={selectedRecipes.length}
                  cookedMeals={cookedMeals}
                  onNext={() => {
                    if (!selectedRecipes.length) {
                      if (topRecommendation) shopRecipe(topRecommendation.recipe.id)
                      return
                    }
                    if (!cookedMeals) {
                      handleStartCooking(selectedRecipes[0].id)
                      return
                    }
                    setView('plan')
                  }}
                />
              </div>
              <div className="quick-plan panel">
                <Sparkles aria-hidden="true" />
                <p className="section-label">Come back path</p>
                <h2>Make tomorrow easier</h2>
                <div className="meal-row"><span>Next</span> {selectedRecipes[0]?.title ?? 'Pick a meal'}</div>
                <div className="meal-row"><span>Repeat</span> {repeatRecipe?.title ?? 'Cook once to unlock repeats'}</div>
                <div className="meal-row"><span>Leftovers</span> {selectedRecipes[0]?.leftovers[0] ?? 'Cook once, eat twice'}</div>
                <div className="plan-stats">
                  <span>{cookedMeals} cooked</span>
                  <span>{overlapScore} overlaps</span>
                  <span>${selectedRecipes.reduce((sum, recipe) => sum + recipe.costEstimateNzd, 0).toFixed(0)}/serve week</span>
                </div>
                <div className="quick-actions">
                  {repeatRecipe ? (
                    <button className="secondary-action" type="button" onClick={() => handleStartCooking(repeatRecipe.id)}>
                      Cook again
                    </button>
                  ) : null}
                  <button className="secondary-action" type="button" onClick={() => {
                    setView('shopping')
                    trackEvent('quick_plan_list_opened', { selectedCount: selectedIds.length })
                  }}>
                    Open list
                  </button>
                  <button className="text-action" type="button" onClick={() => setOnboarded(false)}>Edit setup</button>
                </div>
              </div>
            </section>

            <ModeSelector
              mode={mode}
              onModeChange={(nextMode) => {
                setMode(nextMode)
                setVisibleRecipeCount(12)
                trackEvent('tonight_mode_selected', { mode: nextMode })
              }}
            />

            <FeedbackStrip
              recipe={recentCookedRecipe}
              onFeedback={(outcome) => {
                if (!recentCookedRecipe) return
                addRecipeFeedback(recentCookedRecipe.id, outcome)
                setRecentCookedRecipeId(null)
              }}
              onDismiss={() => setRecentCookedRecipeId(null)}
            />

            {easierFallback ? (
              <section className="fallback-strip panel">
                <BatteryLow aria-hidden="true" />
                <div>
                  <p className="section-label">Even easier fallback</p>
                  <h2>{easierFallback.recipe.title}</h2>
                  <p>{easierFallback.reasons.join(' - ')}</p>
                </div>
                <button type="button" className="secondary-action" onClick={() => handleStartCooking(easierFallback.recipe.id)}>
                  Use this
                </button>
              </section>
            ) : null}

            <section className="filter-section panel">
              <div className="section-heading">
                <div>
                  <p className="section-label">More options</p>
                  <h2>Browse only if tonight's pick is wrong</h2>
                </div>
                <button className="secondary-action" type="button" onClick={() => setShowAdvancedFilters((value) => !value)}>
                  {showAdvancedFilters ? 'Hide filters' : 'More filters'}
                </button>
              </div>
              {(activeFilters.length || searchTerm.trim()) ? (
                <div className="filter-summary">
                  <span>{searchedRecipes.length} meals match your current search and filters.</span>
                  <button type="button" onClick={() => {
                    setActiveFilters([])
                    setSearchTerm('')
                  }}>
                    Clear
                  </button>
                </div>
              ) : null}
              {showAdvancedFilters ? (
                <div className="advanced-filter-panel">
                  <label className="search-box">
                    <Search size={16} aria-hidden="true" />
                    <input
                      value={searchTerm}
                      placeholder="Search meals or ingredients"
                      onChange={(event) => {
                        setSearchTerm(event.target.value)
                        setVisibleRecipeCount(12)
                      }}
                    />
                  </label>
                  <div className="filter-drawer">
                    {filters.map((filter) => (
                      <button
                        aria-pressed={activeFilters.includes(filter)}
                        className={activeFilters.includes(filter) ? 'chip active' : 'chip'}
                        key={filter}
                        type="button"
                        onClick={() => {
                          const nextFilters = toggleItem(activeFilters, filter)
                          setActiveFilters(nextFilters)
                          setVisibleRecipeCount(12)
                          trackEvent('recipe_filter_toggled', { filter, active: nextFilters.includes(filter), filterCount: nextFilters.length })
                          if (['vegetarian', 'healthy', 'high protein'].includes(filter)) {
                            trackEvent('dietary_filter_used', { filter })
                          }
                        }}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>

            {searchedRecipes.length ? (
              <section className="recipe-grid" aria-label="Recipe results">
                {visibleSearchedRecipes.map(({ recipe, reasons }) => (
                  <RecipeCard
                    key={recipe.id}
                    recipe={recipe}
                    reasons={reasons}
                    selected={selectedIds.includes(recipe.id)}
                    favourite={favourites.includes(recipe.id)}
                    onSelect={() => togglePlanRecipe(recipe.id)}
                    onOpen={() => openRecipe(recipe.id)}
                    onFavourite={() => {
                      setFavourites(toggleItem(favourites, recipe.id))
                      setInteractions(updateInteraction(interactions, recipe.id, { saved: !favourites.includes(recipe.id) }))
                      trackEvent(favourites.includes(recipe.id) ? 'recipe_unsaved' : 'recipe_saved', { recipeId: recipe.id })
                    }}
                  />
                ))}
                {visibleRecipeCount < searchedRecipes.length ? (
                  <button className="show-more-card" type="button" onClick={() => setVisibleRecipeCount((value) => value + 12)}>
                    Show 12 more recipes
                    <small>{searchedRecipes.length - visibleRecipeCount} still hidden for speed</small>
                  </button>
                ) : null}
              </section>
            ) : (
              <EmptyState
                title="No realistic match with those filters"
                body="Those filters leave Cookr without a safe dinner. Clear them and start from one realistic pick again."
                action={{ label: 'Clear filters', onClick: () => {
                  setActiveFilters([])
                  setSearchTerm('')
                } }}
              />
            )}

            <WoolworthsAssistCard onOpen={() => setView('shopping')} />
            <HomeWeekStrip weeklyPlan={weeklyPlan} onOpen={openRecipe} />

            {topRecommendation ? (
              <div ref={detailRef}>
                <RecipeDetail
                  recipe={activeRecipe}
                  onCook={() => handleStartCooking(activeRecipe.id)}
                  onAdd={() => togglePlanRecipe(activeRecipe.id)}
                  isInPlan={selectedIds.includes(activeRecipe.id)}
                  variants={activeRecipeVariants}
                  onVariantOpen={openRecipe}
                />
              </div>
            ) : null}

            <section className="insights-grid">
              <div className="panel">
                <Flame aria-hidden="true" />
                <h2>Dinner rescue</h2>
                <p>Cookr keeps quick curry, pizza, noodles, wrap, and sushi-style fallback dinners close.</p>
              </div>
              <div className="panel">
                <RotateCcw aria-hidden="true" />
                <h2>Saved rotation</h2>
                <p>Repeat meals get ranked higher after you cook them. No shame, just easier dinners.</p>
              </div>
              <div className="panel">
                <CalendarDays aria-hidden="true" />
                <h2>Low-waste week</h2>
                <p>Ingredient overlap and leftovers keep the next shop smaller and less annoying.</p>
              </div>
            </section>
          </>
        )}

        {view === 'plan' && (
          <>
            <WeeklyPlanner
              weeklyPlan={weeklyPlan}
              pantryBundle={pantryBundle}
              selectedIds={selectedIds}
              onAddRecipe={togglePlanRecipe}
              onAddWeek={addWeeklyPlan}
              onCook={handleStartCooking}
              onOpen={openRecipe}
            />
            <section className="growth-grid">
              <InstallPromptCard />
              <AccountPanel account={account} setAccount={setAccount} />
              <AnalyticsDashboard feedbackCount={feedback.length} />
              <BetaFeedbackPanel view={view} reports={betaReports} setReports={setBetaReports} />
            </section>
          </>
        )}

        {view === 'shopping' && (
          <ShoppingList
            selectedRecipes={selectedRecipes}
            profile={profile}
            onFindRecipes={() => setView('home')}
            onCook={handleStartCooking}
          />
        )}
        {view === 'cook' && (topRecommendation ? (
          <CookingMode key={activeRecipe.id} recipe={activeRecipe} onComplete={handleCooked} onTooHard={handleTooHard} />
        ) : (
          <EmptyState
            title="No cookable recipe yet"
            body="Your current diet and appliance setup has no safe match in the starter catalogue. Edit setup, then Cookr will rebuild the plan."
            action={{ label: 'Edit setup', onClick: () => setOnboarded(false) }}
          />
        ))}
        {view === 'learn' && (
          <section className="panel learn-panel">
            <p className="section-label">Confidence lessons</p>
            <h1>Small skills that make cooking feel calmer</h1>
            <SafetyNote />
            <div className="lesson-list">
              <article><BookOpen aria-hidden="true" /><h2>Knife-free starts</h2><p>Use frozen veg, slaw kits, grated cheese, and jar garlic until chopping feels less annoying.</p></article>
              <article><Timer aria-hidden="true" /><h2>Timer habit</h2><p>Set a timer before you walk away. It is the cheapest kitchen confidence upgrade.</p></article>
              <article><ShoppingBasket aria-hidden="true" /><h2>Pantry staples</h2><p>Rice, noodles, soy sauce, canned tomatoes, beans, and wraps unlock most beginner meals.</p></article>
            </div>
            <h2>Substitution suggestions</h2>
            <div className="substitution-grid">
              {Object.entries(substitutions).map(([ingredient, swaps]) => (
                <p key={ingredient}><strong>{ingredient}</strong><span>{swaps.join(', ')}</span></p>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="bottom-nav" aria-label="Mobile navigation">
        <button className={view === 'home' ? 'active-nav' : ''} type="button" onClick={() => setView('home')}><ChefHat aria-hidden="true" /> Home</button>
        <button className={view === 'plan' ? 'active-nav' : ''} type="button" onClick={() => setView('plan')}><CalendarDays aria-hidden="true" /> Plan</button>
        <button className={view === 'cook' ? 'active-nav' : ''} type="button" onClick={() => setView('cook')}><Timer aria-hidden="true" /> Cook</button>
        <button className={view === 'shopping' ? 'active-nav' : ''} type="button" onClick={() => setView('shopping')}><ShoppingBasket aria-hidden="true" /> List</button>
        <button className={view === 'learn' ? 'active-nav' : ''} type="button" onClick={() => setView('learn')}><BookOpen aria-hidden="true" /> Learn</button>
      </footer>
    </div>
  )
}

export default App
