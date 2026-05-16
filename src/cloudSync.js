// Cloud sync — mirrors the user's golf data to Firestore so it follows them
// across devices. localStorage is still the primary cache (the app keeps
// working offline), but every change pushes to the cloud, and on sign-in we
// merge the cloud copy back down.
//
// What syncs: roundHistory, bag, shotShape.
// What stays local-only: hole_stats, coach_messages, selected_course, active
// side games — these are session/in-flight state that doesn't make sense to
// sync between devices.

import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db } from './firebase'

const USER_DOC = (uid) => doc(db, 'users', uid)

// On sign-in, merge cloud + local data and return the unified state.
// Round history is merged by id (preserves rounds played offline). For bag
// and shot shape, cloud wins if it exists, otherwise local is promoted.
export async function syncOnSignIn(user) {
  if (!user) return null
  try {
    const snap = await getDoc(USER_DOC(user.uid))
    const cloud = snap.exists() ? snap.data() : {}

    const localRoundHistory = readLocal('round_history', [])
    const localBag = readLocal('my_bag', null)
    const localShotShape = localStorage.getItem('shot_shape') || null

    const cloudRounds = Array.isArray(cloud.roundHistory) ? cloud.roundHistory : []
    const merged = mergeRoundsById(cloudRounds, localRoundHistory)

    const finalBag = cloud.bag || localBag
    const finalShotShape = cloud.shotShape || localShotShape

    // Mirror back to localStorage so the rest of the app reads from one place.
    localStorage.setItem('round_history', JSON.stringify(merged))
    if (finalBag) localStorage.setItem('my_bag', JSON.stringify(finalBag))
    if (finalShotShape) localStorage.setItem('shot_shape', finalShotShape)

    // Push the merged state back so cloud is up to date too.
    await setDoc(USER_DOC(user.uid), {
      roundHistory: merged,
      bag: finalBag || null,
      shotShape: finalShotShape || null,
      lastSync: new Date().toISOString(),
    }, { merge: true })

    return {
      roundHistory: merged,
      bag: finalBag,
      shotShape: finalShotShape,
    }
  } catch (err) {
    console.error('[cloudSync] sign-in sync failed:', err)
    return null
  }
}

// Push the latest round history. Called by App.jsx whenever roundHistory state
// changes. Safe to call when signed out — it just no-ops.
export async function pushRoundHistory(rounds) {
  const user = auth.currentUser
  if (!user) return
  try {
    await setDoc(USER_DOC(user.uid), { roundHistory: rounds }, { merge: true })
  } catch (err) {
    console.error('[cloudSync] push roundHistory failed:', err)
  }
}

export async function pushBag(bag) {
  const user = auth.currentUser
  if (!user) return
  try {
    await setDoc(USER_DOC(user.uid), { bag }, { merge: true })
  } catch (err) {
    console.error('[cloudSync] push bag failed:', err)
  }
}

export async function pushShotShape(shape) {
  const user = auth.currentUser
  if (!user) return
  try {
    await setDoc(USER_DOC(user.uid), { shotShape: shape }, { merge: true })
  } catch (err) {
    console.error('[cloudSync] push shotShape failed:', err)
  }
}

// On sign-out, wipe any cached user data so the next account that signs in on
// this device starts clean. Side-game state and in-flight rounds also get
// cleared so we don't leak one user's data into another's view.
export function clearLocalUserData() {
  const keys = [
    'round_history',
    'my_bag',
    'shot_shape',
    'selected_course',
    'hole_stats',
    'visited_holes',
    'coach_messages',
    'game_skins',
    'game_match',
    'game_wolf',
  ]
  keys.forEach(k => localStorage.removeItem(k))
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function readLocal(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

function mergeRoundsById(a, b) {
  const seen = new Set()
  const out = []
  for (const r of [...a, ...b]) {
    if (!r || r.id == null) continue
    if (seen.has(r.id)) continue
    seen.add(r.id)
    out.push(r)
  }
  return out.sort((x, y) => new Date(y.date) - new Date(x.date))
}
