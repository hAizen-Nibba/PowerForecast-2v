# Performance Learnings (Bolt)

## LivePowerBoard Performance
- Memoize `calculateSimultaneousDemand(appliances, 9.2)` using `React.useMemo` to prevent expensive re-computation during the 1-second live ticker interval.
- Build an index mapping (`spacesMap`) for spaces lookup by ID to convert $O(N \times M)$ search loops to $O(1)$ dictionary lookups during live appliances rendering.
