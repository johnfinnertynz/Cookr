import type { Ingredient } from '../types'

const aliasMap: Record<string, string> = {
  'baby spinach': 'spinach',
  'frozen spinach': 'spinach',
  'frozen broccoli': 'broccoli',
  'microwave basmati rice': 'microwave rice',
  'microwave brown rice': 'microwave rice',
  'microwave sushi rice': 'microwave rice',
  'kewpie-style mayo': 'mayonnaise',
  'mini wraps': 'tortilla wraps',
  'pita breads': 'pita bread',
  'tuna in springwater': 'canned tuna',
}

const unitMap: Record<string, { unit: string; factor: number }> = {
  kg: { unit: 'g', factor: 1000 },
  g: { unit: 'g', factor: 1 },
  l: { unit: 'ml', factor: 1000 },
  ml: { unit: 'ml', factor: 1 },
  tbsp: { unit: 'ml', factor: 15 },
  tsp: { unit: 'ml', factor: 5 },
  cup: { unit: 'cup', factor: 1 },
  cups: { unit: 'cup', factor: 1 },
  can: { unit: 'can', factor: 1 },
  cans: { unit: 'can', factor: 1 },
  pack: { unit: 'pack', factor: 1 },
  packs: { unit: 'pack', factor: 1 },
  packet: { unit: 'packet', factor: 1 },
  pouches: { unit: 'pouch', factor: 1 },
  pouch: { unit: 'pouch', factor: 1 },
  jar: { unit: 'jar', factor: 1 },
  bag: { unit: 'bag', factor: 1 },
  tub: { unit: 'tub', factor: 1 },
  each: { unit: 'each', factor: 1 },
}

export const normalizeIngredientName = (ingredient: Pick<Ingredient, 'name' | 'canonicalName'>) => {
  const rawName = (ingredient.canonicalName ?? ingredient.name).toLowerCase().trim()
  return aliasMap[rawName] ?? rawName
}

export const normalizeIngredientQuantity = (ingredient: Ingredient) => {
  const unit = ingredient.unit.toLowerCase().trim()
  const mapped = unitMap[unit] ?? { unit, factor: 1 }
  return {
    quantity: ingredient.quantity * mapped.factor,
    unit: mapped.unit,
    confidenceNote: unitMap[unit] ? 'normalized' : 'kept original unit',
  }
}

export const formatQuantity = (value: number, unit: string) => {
  const rounded = Number.isInteger(value) ? String(value) : value.toFixed(1).replace('.0', '')
  return `${rounded} ${unit}`
}

export const parseOwnedItems = (ownedItems: string) =>
  ownedItems
    .toLowerCase()
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((name) => aliasMap[name] ?? name)
