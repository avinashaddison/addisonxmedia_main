import { useEffect, useState } from "react";

// Returns a copy of `value` that only updates after `delay` ms of no changes.
// Bind your controlled input to the raw state (so typing stays instant) and use
// the debounced copy for expensive derived work — filtering/sorting large lists
// then runs once typing settles instead of on every keystroke.
export function useDebouncedValue<T>(value: T, delay = 200): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}
