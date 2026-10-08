# DESIGN — Field Notes v2

## Intent
TorqueLab is an editorial mechanical-engineering instrument, not an AI-generated SaaS dashboard.

- **Materials:** matte drafting paper `#f3f0e8`, graphite `#1e2527`, etched marine `#172831`, copper `#b6532f`.
- **Typography:** Barlow Condensed display, IBM Plex Sans body, IBM Plex Mono readings.
- **Layout:** wide asymmetric simulator + precise control strip, open numerical summary with hairline dividers, mobile stack.
- **Anti-patterns:** no generic card grid, glowing status pills, glassmorphism, sweeping gradients, pointless animation or fake measurements.
- **Accuracy:** real Willis equation, accurate ratios, accessible controls, reduced motion, responsive checks.
- **Research:** [Impeccable](https://github.com/pbakaus/impeccable), [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill), [Frontend Design](https://github.com/anthropics/claude-code/tree/main/plugins/frontend-design), and [Reddit design discussions](https://www.reddit.com/r/ClaudeAI/). These are design influences, not copied source files.

Research lives in the Lovable project's Supabase `design_sources`, `design_rules` and `design_tokens` tables, with RLS enabled. The matching standalone JSON/SQLite export is included in the downloadable redesign bundle. The front end runs without database access.
