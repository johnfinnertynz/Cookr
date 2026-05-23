import { useMemo, useState } from 'react'
import {
  AlertCircle,
  BookOpen,
  CalendarDays,
  ChefHat,
  ChevronRight,
  Clock3,
  Flame,
  Heart,
  Moon,
  Search,
  ShoppingBasket,
  Sparkles,
  Timer,
  Utensils,
} from 'lucide-react'
import './App.css'
import { recipes } from './data/recipes'
import { cookingTerms, panicHelp, substitutions } from './lib/cookingHelp'
import { buildGroceryList, estimateBasketTotal } from './lib/grocery'
import { defaultProfile, filterRecipes, getRankedRecipes } from './lib/recommendations'
import type { Recipe, UserProfile } from './types'

const filters = [
  'easy/fast',
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

function toggleItem(list: string[], item: string) {
  return list.includes(item) ? list.filter((value) => value !== item) : [...list, item]
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
  return (
    <section className="onboarding" aria-labelledby="onboarding-title">
      <div className="panel intro-panel">
        <ChefHat aria-hidden="true" />
        <h1 id="onboarding-title">Tonight, without the takeaway</h1>
        <p>
          Tell Cookr what feels realistic tonight. The app will bias toward recipes that are simple,
          affordable, and available in New Zealand supermarkets.
        </p>
        <div className="trust-row">
          <span>NZ measures</span>
          <span>Estimated prices</span>
          <span>Beginner help</span>
        </div>
      </div>

      <div className="panel form-panel">
        <fieldset>
          <legend>Cooking confidence</legend>
          <div className="segmented">
            {confidenceOptions.map((option) => (
              <button
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
          <legend>Preferred cooking styles</legend>
          <div className="chip-grid">
            {styleOptions.map((option) => (
              <button
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
              type="number"
              value={profile.householdSize}
              onChange={(event) => setProfile({ ...profile, householdSize: Number(event.target.value) })}
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
        </div>

        <fieldset>
          <legend>Dietary needs</legend>
          <div className="chip-grid">
            {dietaryOptions.map((option) => (
              <button
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

        <button className="primary-action" type="button" onClick={onFinish}>
          Build my cooking plan <ChevronRight size={18} aria-hidden="true" />
        </button>
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
      <img src={recipe.image} alt="" />
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
          <span>${recipe.costEstimateNzd.toFixed(2)}/serve</span>
          <span>{recipe.proteinEstimateGrams}g protein</span>
        </div>
        <p>{reasons.length ? reasons.join(' · ') : 'Solid Cookr match'} · score {Math.round(score)}</p>
        <div className="card-actions">
          <button type="button" onClick={onSelect}>{selected ? 'In plan' : 'Add to plan'}</button>
          <button type="button" onClick={onOpen}>View recipe</button>
        </div>
      </div>
    </article>
  )
}

function RecipeDetail({
  recipe,
  onCook,
}: {
  recipe: Recipe
  onCook: () => void
}) {
  return (
    <section className="detail-panel panel" aria-labelledby="recipe-title">
      <img src={recipe.image} alt="" />
      <div>
        <p className="section-label">{recipe.cuisine}</p>
        <h2 id="recipe-title">{recipe.title}</h2>
        <div className="detail-stats">
          <span>{recipe.timeMinutes} min</span>
          <span>{recipe.servings} serves</span>
          <span>{recipe.difficulty}</span>
          <span>${recipe.costEstimateNzd.toFixed(2)}/serve est.</span>
        </div>
        <p className="source-note">{recipe.licenseNote}</p>
        <h3>Ingredients</h3>
        <ul className="ingredient-list">
          {recipe.ingredients.map((ingredient) => (
            <li key={`${ingredient.name}-${ingredient.unit}`}>
              <span>{ingredient.name}</span>
              <strong>{ingredient.quantity} {ingredient.unit}</strong>
            </li>
          ))}
        </ul>
        <h3>Easier version</h3>
        <p className="helper-copy">
          Use pre-cut vegetables, microwave rice, and packet sauces where listed. If a step feels too
          hard, choose the closest substitution or skip optional toppings.
        </p>
        <button className="primary-action" type="button" onClick={onCook}>
          Start cooking <Timer size={18} aria-hidden="true" />
        </button>
      </div>
    </section>
  )
}

function CookingMode({ recipe }: { recipe: Recipe }) {
  const [step, setStep] = useState(0)
  const [servings, setServings] = useState(recipe.servings)
  const scale = servings / recipe.servings

  return (
    <section className="cooking-mode panel" aria-labelledby="cooking-title">
      <div className="cooking-header">
        <div>
          <p className="section-label">Cooking mode</p>
          <h2 id="cooking-title">{recipe.title}</h2>
        </div>
        <label className="serving-stepper">
          Serves
          <input min="1" max="10" value={servings} type="number" onChange={(event) => setServings(Number(event.target.value))} />
        </label>
      </div>

      <div className="prep-checklist">
        <h3>Prep checklist</h3>
        {recipe.ingredients.slice(0, 5).map((ingredient) => (
          <label key={ingredient.name}>
            <input type="checkbox" /> {Math.ceil(ingredient.quantity * scale * 10) / 10} {ingredient.unit} {ingredient.name}
          </label>
        ))}
      </div>

      <div className="step-card">
        <span>Step {step + 1} of {recipe.instructions.length}</span>
        <p>{recipe.instructions[step]}</p>
        <div className="timer-strip">
          <Timer size={18} aria-hidden="true" />
          <strong>{step === 0 ? '5 min prep' : 'Set a timer if you walk away'}</strong>
        </div>
        <div className="step-actions">
          <button type="button" disabled={step === 0} onClick={() => setStep((value) => Math.max(0, value - 1))}>Back</button>
          <button type="button" onClick={() => setStep((value) => Math.min(recipe.instructions.length - 1, value + 1))}>Next step</button>
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
          {panicHelp.map((tip) => (
            <p className="panic-tip" key={tip}><AlertCircle size={15} aria-hidden="true" /> {tip}</p>
          ))}
        </div>
      </div>
    </section>
  )
}

function ShoppingList({ selectedRecipes, profile }: { selectedRecipes: Recipe[]; profile: UserProfile }) {
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const baseLines = useMemo(() => buildGroceryList(selectedRecipes, profile.pantryItems), [selectedRecipes, profile.pantryItems])
  const lines = baseLines.map((line) => ({ ...line, checked: checked[line.name] ?? line.checked }))
  const total = estimateBasketTotal(lines)

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
        Links open Woolworths NZ searches for the user to review. Prices are estimates and Cookr does not scrape
        product result pages or automate checkout.
      </p>
      <div className="grocery-list">
        {lines.map((line) => (
          <div className={line.checked ? 'grocery-row checked' : 'grocery-row'} key={`${line.name}-${line.unit}`}>
            <label>
              <input
                type="checkbox"
                checked={line.checked}
                onChange={() => setChecked({ ...checked, [line.name]: !line.checked })}
              />
              <span>
                <strong>{line.name}</strong>
                <small>{line.displayQuantity} · {line.category}{line.pantry ? ' · pantry' : ''}</small>
              </span>
            </label>
            <a href={line.match.searchUrl} target="_blank" rel="noreferrer">
              {line.match.name}
              <small>{line.match.size} · {line.match.confidence} match</small>
            </a>
          </div>
        ))}
      </div>
    </section>
  )
}

function App() {
  const [profile, setProfile] = useState<UserProfile>(defaultProfile)
  const [onboarded, setOnboarded] = useState(false)
  const [activeFilters, setActiveFilters] = useState<string[]>(['easy/fast'])
  const ranked = useMemo(() => filterRecipes(activeFilters, profile), [activeFilters, profile])
  const recommendations = useMemo(() => getRankedRecipes(profile), [profile])
  const [selectedIds, setSelectedIds] = useState<string[]>(['butter-chicken-traybake', 'no-cook-tuna-sushi-bowls'])
  const [favourites, setFavourites] = useState<string[]>(['veggie-pizza-pita'])
  const [activeRecipeId, setActiveRecipeId] = useState(recipes[0].id)
  const [view, setView] = useState<'home' | 'shopping' | 'cook' | 'learn'>('home')

  const selectedRecipes = recipes.filter((recipe) => selectedIds.includes(recipe.id))
  const activeRecipe = recipes.find((recipe) => recipe.id === activeRecipeId) ?? recipes[0]
  const topRecommendation = recommendations[0]

  if (!onboarded) {
    return <Onboarding profile={profile} setProfile={setProfile} onFinish={() => setOnboarded(true)} />
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Cookr home">
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
        <button className="icon-button" type="button" aria-label="Dark mode preview">
          <Moon size={18} aria-hidden="true" />
        </button>
      </header>

      <main id="top">
        {view === 'home' && (
          <>
            <section className="hero-band">
              <div>
                <h1>Tonight, without the takeaway</h1>
                <p>
                  Your best match is <strong>{topRecommendation.recipe.title}</strong>, because it is {topRecommendation.reasons.slice(0, 2).join(' and ')}.
                </p>
                <div className="hero-actions">
                  <button className="primary-action" type="button" onClick={() => setView('cook')}>Start cooking</button>
                  <button className="secondary-action" type="button" onClick={() => setView('shopping')}>Build grocery list</button>
                </div>
              </div>
              <div className="quick-plan panel">
                <Sparkles aria-hidden="true" />
                <h2>This week</h2>
                <div className="meal-row"><span>Mon</span> {selectedRecipes[0]?.title ?? 'Pick a meal'}</div>
                <div className="meal-row"><span>Wed</span> {selectedRecipes[1]?.title ?? 'Pick a meal'}</div>
                <div className="meal-row"><span>Leftovers</span> Turn extra rice into lunch bowls</div>
              </div>
            </section>

            <section className="filter-section panel">
              <div className="section-heading">
                <div>
                  <p className="section-label">Recommended recipes</p>
                  <h2>Made for your confidence level</h2>
                </div>
                <div className="search-box"><Search size={16} aria-hidden="true" /> Search soon</div>
              </div>
              <div className="filter-drawer">
                {filters.map((filter) => (
                  <button
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

            <section className="recipe-grid" aria-label="Recipe results">
              {ranked.map(({ recipe, score, reasons }) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  score={score}
                  reasons={reasons}
                  selected={selectedIds.includes(recipe.id)}
                  favourite={favourites.includes(recipe.id)}
                  onSelect={() => setSelectedIds(toggleItem(selectedIds, recipe.id))}
                  onOpen={() => setActiveRecipeId(recipe.id)}
                  onFavourite={() => setFavourites(toggleItem(favourites, recipe.id))}
                />
              ))}
            </section>

            <RecipeDetail recipe={activeRecipe} onCook={() => setView('cook')} />

            <section className="insights-grid">
              <div className="panel">
                <Flame aria-hidden="true" />
                <h2>Fakeaway mode</h2>
                <p>Replace curry, pizza, noodles, wraps, sushi, and burger cravings with guided supermarket-friendly options.</p>
              </div>
              <div className="panel">
                <CalendarDays aria-hidden="true" />
                <h2>Repeat meals</h2>
                <p>Save favourites, batch cook chilli, and keep a rotation that gets easier every week.</p>
              </div>
              <div className="panel">
                <Utensils aria-hidden="true" />
                <h2>Leftovers mode</h2>
                <p>Cookr suggests rice bowls, wraps, and freezer portions before ingredients drift into the too-hard basket.</p>
              </div>
            </section>
          </>
        )}

        {view === 'shopping' && <ShoppingList selectedRecipes={selectedRecipes} profile={profile} />}
        {view === 'cook' && <CookingMode recipe={activeRecipe} />}
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
