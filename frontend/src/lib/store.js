// Client-side cache over the Umuturage-MIS API.
// Sync getters read the in-memory cache (mirrored to localStorage for instant
// reloads); async mutations call the API, then re-bootstrap the cache.

import {
  apiLogin,
  apiBootstrap,
  apiCreateAccount,
  apiUpdateAccount,
  apiDeleteAccount,
  apiAddRegistration,
  apiSetRegistrationStatus,
  apiAddDeregistration,
  apiSetDeregistrationStatus,
  apiAddNotice,
  apiDeleteNotice,
  apiAddCommander,
  apiDeleteCommander,
  getToken,
  setToken,
} from './api.js'

const CACHE_KEY = 'umuturage.cache'

const EMPTY = {
  account: null,
  accounts: [],
  registrations: [],
  deregistrations: [],
  notices: [],
  commanders: [],
}

function loadCache() {
  try {
    return { ...EMPTY, ...JSON.parse(localStorage.getItem(CACHE_KEY)) }
  } catch {
    return { ...EMPTY }
  }
}

let cache = loadCache()

function persist() {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch {
    // Ignore quota errors — the cache is a convenience mirror, not the source of truth.
  }
}

function applyBootstrap(data) {
  cache = { ...EMPTY, ...data }
  persist()
  return cache
}

function clearCache() {
  cache = { ...EMPTY }
  persist()
}

// Fetch the role-scoped payload for the current token and refresh the cache.
export async function bootstrap() {
  if (!getToken()) {
    clearCache()
    return cache
  }
  try {
    applyBootstrap(await apiBootstrap())
  } catch (err) {
    if (err.status === 401 || err.status === 403) {
      setToken(null)
      clearCache()
    }
  }
  return cache
}

/* ---------------- sync getters (read cache) ---------------- */

export const getAccounts = () => cache.accounts
export const getCurrentAccount = () => cache.account
export const getRegistrations = () => cache.registrations
export const getDeregistrations = () => cache.deregistrations
export const getNotices = () => cache.notices
export const getCommanders = () => cache.commanders

export const getRegistrationsByCitizen = (citizenUid) =>
  cache.registrations.filter((r) => r.citizenUid === citizenUid)

export const getDeregistrationsByCitizen = (citizenUid) =>
  cache.deregistrations.filter((d) => d.citizenUid === citizenUid)

export const getCommandersByCell = (location) =>
  cache.commanders.filter((c) => sameCellLoc(c, location))

export const getOfficersByCell = (location) =>
  cache.accounts.filter(
    (a) => a.role === 'officer' && a.status === 'active' && sameCellLoc(a.location, location),
  )

export function sameCellLoc(a, b) {
  return (
    !!a && !!b &&
    a.province === b.province &&
    a.district === b.district &&
    a.sector === b.sector &&
    a.cell === b.cell
  )
}

/* ---------------- async auth & mutations ---------------- */

export async function login(identifier, password) {
  try {
    const data = await apiLogin(identifier, password)
    setToken(data.token)
    applyBootstrap(data.bootstrap)
    return { account: cache.account }
  } catch (err) {
    return { error: err.message }
  }
}

export function logout() {
  setToken(null)
  clearCache()
}

export async function createAccount(payload) {
  await apiCreateAccount(payload)
  await bootstrap()
}

export async function updateAccount(uidValue, patch) {
  await apiUpdateAccount(uidValue, patch)
  await bootstrap()
}

export async function deleteAccount(uidValue) {
  await apiDeleteAccount(uidValue)
  await bootstrap()
}

export async function addRegistration(reg) {
  await apiAddRegistration(reg)
  await bootstrap()
}

export async function setRegistrationStatus(uidValue, status) {
  await apiSetRegistrationStatus(uidValue, status)
  await bootstrap()
}

export async function addDeregistration() {
  await apiAddDeregistration()
  await bootstrap()
}

export async function setDeregistrationStatus(uidValue, status) {
  await apiSetDeregistrationStatus(uidValue, status)
  await bootstrap()
}

export async function addNotice(notice) {
  await apiAddNotice(notice)
  await bootstrap()
}

export async function deleteNotice(uidValue) {
  await apiDeleteNotice(uidValue)
  await bootstrap()
}

export async function addCommander(commander) {
  await apiAddCommander(commander)
  await bootstrap()
}

export async function deleteCommander(uidValue) {
  await apiDeleteCommander(uidValue)
  await bootstrap()
}

/* ---------------- validation (pure, client-side pre-checks) ---------------- */

export function isNationalIdValid(value) {
  return /^\d{16}$/.test(String(value).trim())
}

export function isLocationComplete(loc) {
  return !!(loc && loc.province && loc.district && loc.sector && loc.cell && loc.village)
}

export function isPhoneValid(value) {
  return /^(?:0|\+250)7\d{8}$/.test(String(value).replace(/[\s-]/g, ''))
}

/* ---------------- stats (derived from cache) ---------------- */

export function computeStats() {
  const accounts = cache.accounts
  const regs = cache.registrations
  const deregs = cache.deregistrations
  const notices = cache.notices
  const commanders = cache.commanders
  const count = (list, key, value) => list.filter((i) => i[key] === value).length

  const byProvince = {}
  regs.forEach((r) => {
    byProvince[r.province] = (byProvince[r.province] || 0) + 1
  })

  // Citizen allocation: how many citizens currently reside at each full location.
  const distributionMap = new Map()
  accounts
    .filter((a) => a.role === 'citizen' && a.location)
    .forEach((a) => {
      const l = a.location
      const key = `${l.province}|${l.district}|${l.sector}|${l.cell}|${l.village}`
      distributionMap.set(key, (distributionMap.get(key) || 0) + 1)
    })
  const distribution = [...distributionMap.entries()]
    .map(([key, citizens]) => {
      const [province, district, sector, cell, village] = key.split('|')
      return { province, district, sector, cell, village, citizens }
    })
    .sort((a, b) => b.citizens - a.citizens || a.province.localeCompare(b.province))

  const citizensByProvince = {}
  distribution.forEach((d) => {
    citizensByProvince[d.province] = (citizensByProvince[d.province] || 0) + d.citizens
  })

  return {
    citizens: accounts.filter((a) => a.role === 'citizen').length,
    officersActive: accounts.filter((a) => a.role === 'officer' && a.status === 'active').length,
    officersPending: accounts.filter((a) => a.role === 'officer' && a.status === 'pending').length,
    statisticsAccounts: accounts.filter((a) => a.role === 'statistics').length,
    relocations: {
      pending: count(regs, 'status', 'pending'),
      approved: count(regs, 'status', 'approved'),
      rejected: count(regs, 'status', 'rejected'),
      total: regs.length,
    },
    deregistrations: {
      pending: count(deregs, 'status', 'pending'),
      approved: count(deregs, 'status', 'approved'),
      rejected: count(deregs, 'status', 'rejected'),
      total: deregs.length,
    },
    notices: notices.length,
    commanders: commanders.length,
    byProvince,
    distribution,
    citizensByProvince,
  }
}
