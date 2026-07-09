# Clockchain Canvas Base

This folder provides the initial renderable layout for the Clockchain NT-SZ model.

## Files

- `clockchain_canvas_base.json`: base layered canvas model (L0-L7, domains, ribbons, views, nodes, and edges).

## Mapping

- Source graph: `docs/clockchain/ntx/*.ntx`
- Coverage rule: `NT-R2` (each REQ/CTR must have TRACE links to at least one TST and one MET)
- Validator: `scripts/clockchain/validate-ntx.js`

## Intended use

1. Load `clockchain_canvas_base.json` in your graph/canvas renderer.
2. Overlay live edge weights from NTX synapse files.
3. Build filtered views using `views[*].focusKinds`.
