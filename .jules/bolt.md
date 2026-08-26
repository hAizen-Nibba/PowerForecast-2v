
## 2024-05-18 - [LivePowerBoard Component Optimizations]
**Learning:** React components containing tight interval loops (e.g., 1000ms stopwatch ticks) cause complete sub-tree re-renders. Unmemoized array calculations and nested lookups (O(N^2)) inside these render loops become severe performance bottlenecks as the lists grow, especially when they only depend on external data fetched, not the internal tick state.
**Action:** Always memoize derived state (`useMemo`) and replace `Array.prototype.find()` lookups within `.map()` rendering blocks with O(1) Record/Map lookups when components re-render aggressively due to local timers or animation ticks.
