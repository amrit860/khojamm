/**
 * Safe Event Dispatcher
 * Dispatches DOM events asynchronously in the next macrotask to prevent
 * React "Cannot update a component while rendering a different component" lifecycle collisions.
 */
export function safeDispatchEvent(eventName: string): void {
  if (typeof window === 'undefined') return;
  setTimeout(() => {
    try {
      window.dispatchEvent(new Event(eventName));
    } catch (e) {
      console.warn(`Safe dispatch notice for ${eventName}:`, e);
    }
  }, 0);
}
