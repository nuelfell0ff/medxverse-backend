import { bedWardEvents } from './bed-ward.events.js';
/**
 * Adapter boundary for an external facilities/housekeeping system.
 * The local event bus is intentionally the default so the module works
 * without a vendor-specific facilities dependency. A production connector
 * can subscribe here and publish these events to the hospital's housekeeping
 * queue or API.
 */
export function subscribeHousekeeping(handler) {
    bedWardEvents.on('housekeeping', handler);
    return () => bedWardEvents.off('housekeeping', handler);
}
