import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  BadgeCheck,
  BatteryLow,
  BookOpen,
  CalendarDays,
  ChefHat,
  ChevronRight,
  Clock3,
  Dumbbell,
  Flame,
  Heart,
  Loader2,
  Moon,
  RotateCcw,
  Search,
  ShoppingBasket,
  Sparkles,
  Timer,
  WifiOff,
  Zap,
} from 'lucide-react'
import './App.css'
import { recipes } from './data/recipes'
import { cookingTerms, panicHelp, substitutions } from './lib/cookingHelp'
import { buildGroceryList, estimateBasketTotal } from './lib/grocery'
import {
  defaultProfile,
  filterRecipes,
  getIngredientOverlapScore,
  getRankedRecipes,
  makeRecommendationContext,
} from './lib/recommendations'
import { trackEvent } from './lib/analytics'
import { useOnlineStatus, useStoredState } from './lib/storage'
import type { Recipe, RecipeInteraction, TonightMode, UserProfile } from './types'

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

const modeOptions: Array<{
  id: TonightMode
  label: string
  description: string
  icon: typeof BatteryLow
}> = [
  { id: 'no_energy', label: 'No energy', description: 'Lowest effort, minimal dishes', icon: BatteryLow },
  { id: 'cook_15', label: 'Cook in 15', description: 'Emergency dinner rescue', icon: Zap },
  { id: 'post_gym', label: 'Post-gym', description: 'Fast, filling, high protein', icon: Dumbbell },
  { id: 'use_what_i_have', label: 'Use pantry', description: 'Bias toward what you own', icon: ShoppingBasket },
  { id: 'normal', label: 'Normal night', description: 'Best overall match', icon: ChefHat },
]

const toggleItem = (list: string[], item: string) =>
  list.includes(item) ? list.filter((value) => value !== item) : [...list, item]

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
      </div>

      <div className="panel form-panel">
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
              type="number"
              value={profile.householdSize}
              onChange={(event) => setProfile({ ...profile, householdSize: Number(event.target.value) || 1 })}
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
            Tonight energy
            <input
              min="1"
              max="5"
              inputMode="numeric"
              type="number"
              value={profile.energyLevel}
              onChange={(event) => setProfile({ ...profile, energyLevel: Number(event.target.value) || 1 })}
            />
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
                onClick={() => setProfile({ ...profile, dietaries: toggleItem(profile.dietaries, option) })}
                type="button"
              >
                {option}
              </button>
            ))}
          </div>
        </fieldset>

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

function ModeSelector({
  mode,
  onModeChange,
}: {
  mode: TonightMode
  onModeChange: (mode: TonightMode) => void
}) {
  return (
    <section className="mode-strip" aria-labelledby="mode-title">
      <div>
        <p className="section-label">Tonight mode</p>
        <h2 id="mode-title">What can you manage?</h2>
      </div>
      <div className="mode-grid">
        {modeOptions.map((option) => {
          const Icon = option.icon
          return (
            <button
              key={option.id}
              className={mode === option.id ? 'mode-card active-mode' : 'mode-card'}
              type="button"
              aria-pressed={mode === option.id}
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

function RecipeCard({
  recipe,
  score,
  reasons,
  selected,
  favourite,
  onSelect,
  onOpen,
  onFavourite,
}: {
  recipe: Recipe
  score: number
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
        <img src={recipe.image} alt="" loading="lazy" decoding="async" />
      </button>
      <div className="recipe-body">
        <div className="card-topline">
          <span>{recipe.takeawayReplacement} fakeaway</span>
          <button type="button" className={favourite ? 'icon-button saved' : 'icon-button'} onClick={onFavourite} aria-label="Save recipe">
            <Heart size={17} aria-hidden="true" />
          </button>
        </div>
        <h3>{recipe.title}</h3>
        <div className="meta-row">
          <span><Clock3 size={15} aria-hidden="true" /> {recipe.timeMinutes} min</span>
          <span>{recipe.activeTimeMinutes} min active</span>
          <span>${recipe.costEstimateNzd.toFixed(2)}/serve</span>
          <span>{recipe.proteinEstimateGrams}g protein</span>
        </div>
        <p>{reasons.length ? reasons.join(' · ') : 'Solid Cookr match'} · {Math.round(score)} fit</p>
        <div className="effort-meter" aria-label={`Effort ${recipe.effortScore} out of 5`}>
          {Array.from({ length: 5 }).map((_, index) => (
            <span className={index < recipe.effortScore ? 'filled' : ''} key={index} />
          ))}
        </div>
        <div className="card-actions">
          <button type="button" onClick={onSelect}>{selected ? 'In plan' : 'Add to plan'}</button>
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

function RecipeDetail({
  recipe,
  onCook,
  onAdd,
}: {
  recipe: Recipe
  onCook: () => void
  onAdd: () => void
}) {
  return (
    <section className="detail-panel panel" aria-labelledby="recipe-title">
      <img src={recipe.image} alt="" loading="lazy" decoding="async" />
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
          <button className="secondary-action" type="button" onClick={onAdd}>Add to plan</button>
          <button className="primary-action" type="button" onClick={onCook}>
            Start cooking <Timer size={18} aria-hidden="true" />
          </button>
        </div>
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
  const [step, setStep] = useState(0)
  const [servings, setServings] = useState(recipe.servings)
  const scale = servings / recipe.servings
  const finalStep = step === recipe.instructions.length - 1

  return (
    <section className="cooking-mode panel" aria-labelledby="cooking-title">
      <div className="cooking-header">
        <div>
          <p className="section-label">Cooking mode</p>
          <h2 id="cooking-title">{recipe.title}</h2>
        </div>
        <label className="serving-stepper">
          Serves
          <input min="1" max="10" value={servings} inputMode="numeric" type="number" onChange={(event) => setServings(Number(event.target.value) || 1)} />
        </label>
      </div>

      <div className="prep-checklist">
        <h3>Get this out first</h3>
        {recipe.ingredients.slice(0, 5).map((ingredient) => (
          <label key={ingredient.name}>
            <input type="checkbox" /> {Math.ceil(ingredient.quantity * scale * 10) / 10} {ingredient.unit} {ingredient.name}
          </label>
        ))}
      </div>

      <div className="step-card">
        <span>Step {step + 1} of {recipe.instructions.length}</span>
        <p>{recipe.instructions[step]}</p>
        <div className="visual-cue">
          <strong>What should this look like?</strong>
          <span>{recipe.visualCues[step % recipe.visualCues.length]}</span>
        </div>
        <div className="timer-strip">
          <Timer size={18} aria-hidden="true" />
          <strong>{step === 0 ? `${Math.max(5, recipe.activeTimeMinutes)} min active cooking` : 'Set a timer if you walk away'}</strong>
        </div>
        <div className="step-actions">
          <button type="button" disabled={step === 0} onClick={() => setStep((value) => Math.max(0, value - 1))}>Back</button>
          <button
            type="button"
            onClick={() => (finalStep ? onComplete() : setStep((value) => Math.min(recipe.instructions.length - 1, value + 1)))}
          >
            {finalStep ? 'Mark cooked' : 'Next step'}
          </button>
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
}: {
  selectedRecipes: Recipe[]
  profile: UserProfile
  onFindRecipes: () => void
}) {
  const [checked, setChecked] = useStoredState<Record<string, boolean>>('cookr.grocery.checked.v1', {})
  const baseLines = useMemo(() => buildGroceryList(selectedRecipes, profile.pantryItems), [selectedRecipes, profile.pantryItems])
  const lines = baseLines.map((line) => ({ ...line, checked: checked[line.name] ?? line.checked }))
  const total = estimateBasketTotal(lines)
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
        <strong>${total.toFixed(2)} est.</strong>
      </div>
      <p className="source-note">
        Links open user-controlled Woolworths NZ searches. Prices are estimates; Cookr does not scrape result
        pages or automate checkout.
      </p>
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
                    onChange={() => setChecked({ ...checked, [line.name]: !line.checked })}
                  />
                  <span>
                    <strong>{line.name}</strong>
                    <small>{line.displayQuantity} · {line.confidenceNote}{line.pantry ? ' · pantry' : ''}</small>
                  </span>
                </label>
                <a href={line.match.searchUrl} target="_blank" rel="noreferrer" onClick={() => trackEvent('product_link_opened', { ingredient: line.name, confidence: line.match.confidence })}>
                  {line.match.name}
                  <small>{line.match.size} · {line.match.confidence} match</small>
                </a>
              </div>
            ))}
          </section>
        ))}
      </div>
    </section>
  )
}

function App() {
  const online = useOnlineStatus()
  const [profile, setProfile] = useStoredState<UserProfile>('cookr.profile.v2', defaultProfile)
  const [onboarded, setOnboarded] = useStoredState('cookr.onboarded.v1', false)
  const [activeFilters, setActiveFilters] = useStoredState<string[]>('cookr.filters.v1', ['easy/fast'])
  const [selectedIds, setSelectedIds] = useStoredState<string[]>('cookr.plan.v1', ['butter-chicken-traybake', 'no-cook-tuna-sushi-bowls'])
  const [favourites, setFavourites] = useStoredState<string[]>('cookr.favourites.v1', ['veggie-pizza-pita'])
  const [interactions, setInteractions] = useStoredState<RecipeInteraction[]>('cookr.interactions.v1', [])
  const [activeRecipeId, setActiveRecipeId] = useStoredState('cookr.activeRecipe.v1', recipes[0].id)
  const [view, setView] = useStoredState<'home' | 'shopping' | 'cook' | 'learn'>('cookr.view.v1', 'home')
  const [mode, setMode] = useStoredState<TonightMode>('cookr.mode.v1', 'cook_15')
  const [searchTerm, setSearchTerm] = useState('')
  const [isStarting, setIsStarting] = useState(false)
  const deferredSearch = useDeferredValue(searchTerm)

  const context = useMemo(
    () => makeRecommendationContext(profile, { mode, energyLevel: profile.energyLevel, interactions }),
    [profile, mode, interactions],
  )
  const ranked = useMemo(() => filterRecipes(activeFilters, profile, context), [activeFilters, profile, context])
  const searchedRecipes = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase()
    if (!query) return ranked
    return ranked.filter(({ recipe }) =>
      [recipe.title, recipe.cuisine, recipe.takeawayReplacement, recipe.tags.join(' '), recipe.ingredients.map((item) => item.name).join(' ')]
        .join(' ')
        .toLowerCase()
        .includes(query),
    )
  }, [deferredSearch, ranked])
  const recommendations = useMemo(() => getRankedRecipes(profile, context), [profile, context])
  const selectedRecipes = useMemo(() => recipes.filter((recipe) => selectedIds.includes(recipe.id)), [selectedIds])
  const activeRecipe = recipes.find((recipe) => recipe.id === activeRecipeId) ?? recipes[0]
  const topRecommendation = recommendations[0]
  const easierFallback = recommendations.find(({ recipe }) => recipe.effortScore <= 1 && recipe.id !== topRecommendation.recipe.id)
  const overlapScore = getIngredientOverlapScore(selectedRecipes)
  const cookedMeals = interactions.reduce((sum, interaction) => sum + (interaction.cookedCount ?? 0), 0)

  const handleFinishOnboarding = () => {
    setOnboarded(true)
    trackEvent('onboarding_completed', { confidence: profile.confidence, blockers: profile.blockers.length })
  }

  const openRecipe = (recipeId: string) => {
    setActiveRecipeId(recipeId)
    trackEvent('recipe_detail_opened', { recipeId })
  }

  const togglePlanRecipe = (recipeId: string) => {
    setSelectedIds(toggleItem(selectedIds, recipeId))
    trackEvent(selectedIds.includes(recipeId) ? 'recipe_removed_from_plan' : 'recipe_added_to_plan', { recipeId })
  }

  const handleStartCooking = (recipeId = activeRecipe.id) => {
    setIsStarting(true)
    setActiveRecipeId(recipeId)
    window.setTimeout(() => {
      setIsStarting(false)
      setView('cook')
      trackEvent('cooking_started', { recipeId, mode })
    }, 180)
  }

  const handleCooked = () => {
    const current = interactions.find((interaction) => interaction.recipeId === activeRecipe.id)
    setInteractions(updateInteraction(interactions, activeRecipe.id, {
      cookedCount: (current?.cookedCount ?? 0) + 1,
      lastCookedAt: new Date().toISOString(),
      wouldRepeat: true,
    }))
    trackEvent('cooking_completed', { recipeId: activeRecipe.id })
    setView('home')
  }

  const handleTooHard = () => {
    const current = interactions.find((interaction) => interaction.recipeId === activeRecipe.id)
    setInteractions(updateInteraction(interactions, activeRecipe.id, {
      tooHardCount: (current?.tooHardCount ?? 0) + 1,
    }))
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
    <div className="app-shell">
      <StatusBanner online={online} />
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Cookr home" onClick={() => setView('home')}>
          <ChefHat aria-hidden="true" /> Cookr
        </a>
        <nav aria-label="Primary">
          {[
            ['home', 'Home'],
            ['shopping', 'List'],
            ['cook', 'Cook'],
            ['learn', 'Learn'],
          ].map(([id, label]) => (
            <button className={view === id ? 'active-nav' : ''} type="button" key={id} onClick={() => setView(id as typeof view)}>
              {label}
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
            <ModeSelector
              mode={mode}
              onModeChange={(nextMode) => {
                setMode(nextMode)
                trackEvent('tonight_mode_selected', { mode: nextMode })
              }}
            />

            <section className="hero-band">
              <div>
                <p className="section-label">Best right now</p>
                <h1>{mode === 'no_energy' ? 'Feed yourself with almost no effort' : 'Tonight, without the takeaway'}</h1>
                <p>
                  Start with <strong>{topRecommendation.recipe.title}</strong>: {topRecommendation.reasons.slice(0, 3).join(', ')}.
                </p>
                <div className="hero-actions">
                  <button className="primary-action" type="button" onClick={() => handleStartCooking(topRecommendation.recipe.id)}>
                    {isStarting ? <Loader2 className="spin" size={18} aria-hidden="true" /> : <Timer size={18} aria-hidden="true" />}
                    Start cooking
                  </button>
                  <button className="secondary-action" type="button" onClick={() => setView('shopping')}>Build grocery list</button>
                </div>
              </div>
              <div className="quick-plan panel">
                <Sparkles aria-hidden="true" />
                <h2>This week</h2>
                <div className="meal-row"><span>Next</span> {selectedRecipes[0]?.title ?? 'Pick a meal'}</div>
                <div className="meal-row"><span>Repeat</span> {favourites.length ? recipes.find((recipe) => recipe.id === favourites[0])?.title : 'Save a reliable meal'}</div>
                <div className="meal-row"><span>Leftovers</span> {selectedRecipes[0]?.leftovers[0] ?? 'Cook once, eat twice'}</div>
                <div className="plan-stats">
                  <span>{cookedMeals} cooked</span>
                  <span>{overlapScore} overlaps</span>
                  <span>${selectedRecipes.reduce((sum, recipe) => sum + recipe.costEstimateNzd, 0).toFixed(0)}/serve week</span>
                </div>
              </div>
            </section>

            {easierFallback ? (
              <section className="fallback-strip panel">
                <BatteryLow aria-hidden="true" />
                <div>
                  <p className="section-label">Even easier fallback</p>
                  <h2>{easierFallback.recipe.title}</h2>
                  <p>{easierFallback.reasons.join(' · ')}</p>
                </div>
                <button type="button" className="secondary-action" onClick={() => handleStartCooking(easierFallback.recipe.id)}>
                  Use this
                </button>
              </section>
            ) : null}

            <section className="filter-section panel">
              <div className="section-heading">
                <div>
                  <p className="section-label">Recommended recipes</p>
                  <h2>Choose from realistic options</h2>
                </div>
                <label className="search-box">
                  <Search size={16} aria-hidden="true" />
                  <input value={searchTerm} placeholder="Search meals or ingredients" onChange={(event) => setSearchTerm(event.target.value)} />
                </label>
              </div>
              <div className="filter-drawer">
                {filters.map((filter) => (
                  <button
                    aria-pressed={activeFilters.includes(filter)}
                    className={activeFilters.includes(filter) ? 'chip active' : 'chip'}
                    key={filter}
                    type="button"
                    onClick={() => setActiveFilters(toggleItem(activeFilters, filter))}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </section>

            {searchedRecipes.length ? (
              <section className="recipe-grid" aria-label="Recipe results">
                {searchedRecipes.map(({ recipe, score, reasons }) => (
                  <RecipeCard
                    key={recipe.id}
                    recipe={recipe}
                    score={score}
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
              </section>
            ) : (
              <EmptyState
                title="No realistic match with those filters"
                body="Drop one filter or switch to No energy mode. Cookr will keep the decision small."
                action={{ label: 'Clear filters', onClick: () => setActiveFilters([]) }}
              />
            )}

            <RecipeDetail
              recipe={activeRecipe}
              onCook={() => handleStartCooking(activeRecipe.id)}
              onAdd={() => togglePlanRecipe(activeRecipe.id)}
            />

            <section className="insights-grid">
              <div className="panel">
                <Flame aria-hidden="true" />
                <h2>Takeaway rescue</h2>
                <p>Cookr always keeps a curry, pizza, noodles, wrap, and sushi-style fallback close.</p>
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

        {view === 'shopping' && <ShoppingList selectedRecipes={selectedRecipes} profile={profile} onFindRecipes={() => setView('home')} />}
        {view === 'cook' && <CookingMode key={activeRecipe.id} recipe={activeRecipe} onComplete={handleCooked} onTooHard={handleTooHard} />}
        {view === 'learn' && (
          <section className="panel learn-panel">
            <p className="section-label">Confidence lessons</p>
            <h1>Small skills that make cooking feel calmer</h1>
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
            <p className="project-note">
              Project context: <a href="https://www.johnfinnerty.co.nz/projects/cookr.html">Cookr case study</a>
            </p>
          </section>
        )}
      </main>

      <footer className="bottom-nav" aria-label="Mobile navigation">
        <button className={view === 'home' ? 'active-nav' : ''} type="button" onClick={() => setView('home')}><ChefHat aria-hidden="true" /> Home</button>
        <button className={view === 'shopping' ? 'active-nav' : ''} type="button" onClick={() => setView('shopping')}><ShoppingBasket aria-hidden="true" /> List</button>
        <button className={view === 'cook' ? 'active-nav' : ''} type="button" onClick={() => setView('cook')}><Timer aria-hidden="true" /> Cook</button>
      </footer>
    </div>
  )
}

export default App
