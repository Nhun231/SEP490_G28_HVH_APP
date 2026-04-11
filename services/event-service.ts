/**
 * event-service.ts — Barrel re-export (backward compatibility shim)
 *
 * This file re-exports everything from the split service files so that
 * existing imports from '@/services/event-service' continue to work
 * during the migration period.
 *
 * New code should import directly from the specific service files:
 *   - @/services/event-types         (interfaces & types)
 *   - @/services/api-helpers         (error utils, resolveSupabaseUrl)
 *   - @/services/public-event-service (public/no-auth APIs)
 *   - @/services/vol-event-service   (volunteer APIs)
 *   - @/services/host-event-service  (host APIs)
 */

export * from './event-types'
export * from './api-helpers'
export * from './public-event-service'
export * from './vol-event-service'
export * from './host-event-service'
