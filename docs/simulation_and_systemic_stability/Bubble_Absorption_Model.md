# Bubble Absorption Model (Draft)

Disclaimer: Operational and research draft. Not legal advice.

## Simulation engine overview
Agent based and scenario driven simulation of capital inflows, price dynamics, and policy response.

## Agents
- Retail investors
- Institutional investors
- Speculators
- System operators

## State variables
- underlyingPrice
- occupancyRate
- rentalFlows
- capitalVelocity
- availableLiquidity
- speculativePressure
- seriesSupply

## Rules
- Emission per series is capped by verified asset capacity.
- Lockups reduce short term trading pressure.
- Whitelist and eligibility gates filter inflows.
- Policy caps throttle secondary liquidity.

## Shocks
- External price crash
- Over supply shock
- Liquidity drain
- Regulatory stress

## Output data
- time series of price vs asset value
- absorption rate of inflows
- trigger points for policy changes

## Pseudocode (ASCII)
for t in range(T):
  update_prices()
  apply_shocks()
  apply_policy_caps()
  compute_metrics()
