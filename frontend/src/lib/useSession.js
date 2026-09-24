import { useSyncExternalStore } from 'react'
import { getCurrentAccount } from './store.js'

let version = 0
const listeners = new Set()

export function bumpSession() {
  version += 1
  listeners.forEach((l) => l())
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useSession() {
  useSyncExternalStore(subscribe, () => version)
  return getCurrentAccount()
}
