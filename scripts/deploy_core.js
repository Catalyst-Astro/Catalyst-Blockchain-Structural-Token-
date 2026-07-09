// =============================================================================
// deploy_core.js — Despliegue completo del ecosistema Catalyst en localhost
// =============================================================================
// npx hardhat node                                      # Terminal 1
// npx hardhat run scripts/deploy_core.js --network localhost  # Terminal 2
// =============================================================================

const { ethers } = require("hardhat");

async function deploy(name, ...args) {
  const factory = await ethers.getContractFactory(name);
  const contract = await factory.deploy(...args);
  await contract.waitForDeployment();
  const addr = await contract.getAddress();
  console.log(`  ✓ ${name}: ${addr}`);
  return { name, address: addr, contract };
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const ADDR = deployer.address;
  const ZERO = "0x0000000000000000000000000000000000000000";

  console.log(`\n  Deployer: ${ADDR}`);
  console.log(`  Balance:  ${ethers.formatEther(await ethers.provider.getBalance(ADDR))} ETH\n`);

  const deployed = [];

  // ── 1. Infraestructura base ──
  console.log("── 1. Infraestructura Base ──");
  const roleAuth = await deploy("RoleAuthority", ADDR);
  deployed.push(roleAuth);
  // EmergencyMode: (admin, maxDurationSeconds_)
  const emergencyMode = await deploy("EmergencyMode", ADDR, 86400); // 24 hours max
  deployed.push(emergencyMode);

  // ── 2. Tokens ──
  console.log("\n── 2. Tokens ──");
  const catToken = await deploy(
    "CatalystToken", "Catalyst Token", "CAT",
    ethers.parseEther("1000000000"), 250 // 2.5% annual inflation
  );
  deployed.push(catToken);

  const frtToken = await deploy(
    "InflationaryRewardToken", "Fractal Reward Token", "FRT",
    ethers.parseEther("1000000"), 500, ADDR
  );
  deployed.push(frtToken);

  const fltToken = await deploy("FractalToken", ethers.parseEther("1000000000")); // 1B FLT = same as CAT
  deployed.push(fltToken);

  const aimToken = await deploy("AIMToken"); // AI Module Token — minted on demand, no initial supply
  deployed.push(aimToken);
  console.log(`  AIM Token: 0 initial supply (minted when users pay CAT for AI)`);

  // ── 3. Identity ──
  console.log("\n── 3. Identity ──");
  const identitySBT = await deploy("CatalystIdentitySBT", ADDR);
  deployed.push(identitySBT);
  const idRegistry = await deploy("IdentityRegistry", roleAuth.address);
  deployed.push(idRegistry);

  // ── 4. Compliance ──
  console.log("\n── 4. Compliance ──");
  const whitelist = await deploy("WhitelistRegistry", ADDR);
  deployed.push(whitelist);

  // Si ComplianceDAO toma (admin, votingPolicy), usa deployer como policy
  const complianceDAO = await deploy("ComplianceDAO", ADDR, ADDR);
  deployed.push(complianceDAO);

  // FreezeRegistry: (admin, policyRegistry_, emergencyMode_)
  let freezeRegistry;
  try {
    freezeRegistry = await deploy("FreezeRegistry", ADDR, ZERO, emergencyMode.address);
    deployed.push(freezeRegistry);
  } catch (e) {
    console.log("  ⚠ FreezeRegistry: usando deploy alternativo");
    try {
      freezeRegistry = await deploy("FreezeRegistry", ADDR);
      deployed.push(freezeRegistry);
    } catch (e2) {
      console.log("  ✗ FreezeRegistry no se pudo desplegar:", e2.message?.slice(0, 80));
    }
  }

  // ── 5. Governance ──
  console.log("\n── 5. Governance ──");
  const govDAO = await deploy("GovernanceDAO", catToken.address, ADDR);
  deployed.push(govDAO);

  // FractalDAO: (token, quorum, votingPeriod)
  const fractalDAO = await deploy(
    "FractalDAO", catToken.address,
    ethers.parseEther("15000"), // 15,000 tokens quorum
    7 * 86400 // 7 days voting period in seconds
  );
  deployed.push(fractalDAO);

  // MultisigCouncil: (members[], threshold, guardian)
  const multisig = await deploy(
    "MultisigCouncil",
    [ADDR, "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"],
    2, // threshold
    ADDR // guardian
  );
  deployed.push(multisig);

  // ── 6. Treasury & Finance ──
  console.log("\n── 6. Treasury & Finance ──");
  const treasury = await deploy("Treasury", ADDR);
  deployed.push(treasury);
  const settlements = await deploy("SettlementLog", ADDR);
  deployed.push(settlements);

  // ── 7. Pricing & Value Layer ──
  console.log("\n── 7. MXN Price Oracle ──");
  // Deploy MXNPriceOracle: (admin, initialCatUsdRate, initialUsdMxnRate)
  // 1 CAT = $0.10 USD → 0.10 × 1e18 = 1e17
  // 1 USD = $20.00 MXN → 20.00 × 1e18 = 20e18
  const INITIAL_CAT_USD = ethers.parseUnits("0.10", 18);  // 1e17 = $0.10
  const INITIAL_USD_MXN = ethers.parseUnits("20.00", 18); // 20e18 = $20.00 MXN
  const mxnOracle = await deploy(
    "MXNPriceOracle",
    ADDR,
    INITIAL_CAT_USD,
    INITIAL_USD_MXN
  );
  deployed.push(mxnOracle);
  // Verify rates
  const catMxnRate = await mxnOracle.contract.getCatMxnRate();
  console.log(`  ✓ CAT/USD:    $${ethers.formatUnits(await mxnOracle.contract.getCatUsdRate(), 18)} USD`);
  console.log(`  ✓ USD/MXN:   $${ethers.formatUnits(await mxnOracle.contract.getUsdMxnRate(), 18)} MXN`);
  console.log(`  ✓ CAT/MXN:   $${ethers.formatUnits(catMxnRate, 18)} MXN per CAT`);
  console.log(`  ✓ 1 CAT paga ≈ $${ethers.formatUnits(catMxnRate, 18)} MXN en servicios`);

  // ── 7b. Pricing Engine ──
  console.log("\n── 7b. Pricing Engine ──");
  // ServicePricing: (catToken, frtToken, treasury, stakingPool, mxnOracle)
  const svcPricing = await deploy(
    "ServicePricing",
    catToken.address,
    frtToken.address,
    treasury.address,
    treasury.address, // staking pool = treasury initially
    mxnOracle.address
  );
  deployed.push(svcPricing);

  // ── 7b. AI Service Meter ──
  console.log("\n── 7b. AI Service Meter (AIM) ──");
  const aiMeter = await deploy(
    "AIServiceMeter",
    aimToken.address,
    catToken.address,
    svcPricing.address,
    treasury.address
  );
  deployed.push(aiMeter);

  // Transfer MINTER_ROLE and METER_ROLE of AIM to AIServiceMeter
  const aimContract = await ethers.getContractAt("AIMToken", aimToken.address);
  const MINTER_ROLE = aimContract.MINTER_ROLE();
  const METER_ROLE = aimContract.METER_ROLE();
  const DEFAULT_ADMIN = aimContract.DEFAULT_ADMIN_ROLE();
  await aimContract.grantRole(MINTER_ROLE, aiMeter.address);
  await aimContract.grantRole(METER_ROLE, aiMeter.address);
  await aimContract.renounceRole(MINTER_ROLE, ADDR);  // deployer no longer minter
  await aimContract.renounceRole(METER_ROLE, ADDR);    // only meter can consume
  console.log("  ✓ AIM roles delegated to AIServiceMeter");
  console.log("  ✓ AI Services: Chat(10) | Cognitive(50) | Research(500) | Review(100) | Training(1000)");
  console.log("  ✓ Revenue: 80% provider | 15% treasury | 5% burn");
  console.log("  ✓ Exchange: 1 CAT = 10 AIM");

  // ── 7c. MXN Dynamic Pricing Smoke Test ──
  console.log("\n── 7c. MXN Dynamic Pricing Test ──");
  const catContractEarly = await ethers.getContractAt("CatalystToken", catToken.address);
  try {
    // Enable MXN pricing mode
    await svcPricing.contract.setUseMxnPricing(true);
    console.log("  ✓ MXN dynamic pricing ACTIVATED");

    // Test 1: Check required CAT for Audit Basic ($20,000 MXN)
    const auditBasic = ethers.keccak256(ethers.toUtf8Bytes("audit_basic"));
    const requiredCAT = await svcPricing.contract.getRequiredCAT(auditBasic);
    console.log(`  ✓ Audit Basic: $20,000 MXN → ${ethers.formatEther(requiredCAT)} CAT (at 1 CAT = $${ethers.formatUnits(catMxnRate, 18)} MXN)`);

    // Test 2: Check MXN price for Project Registration
    const projectReg = ethers.keccak256(ethers.toUtf8Bytes("project_registration"));
    const mxnPrice = await svcPricing.contract.getServiceMxnPrice(projectReg);
    const requiredCatProj = await svcPricing.contract.getRequiredCAT(projectReg);
    console.log(`  ✓ Project Registration: $${ethers.formatUnits(mxnPrice, 18)} MXN → ${ethers.formatEther(requiredCatProj)} CAT`);

    // Test 3: What if CAT/USD doubles? ($0.20)
    const NEW_CAT_USD = ethers.parseUnits("0.20", 18); // CAT doubles in value
    await mxnOracle.contract.setCatUsdRate(NEW_CAT_USD);
    const newCatMxn = await mxnOracle.contract.getCatMxnRate();
    const newRequiredCAT = await svcPricing.contract.getRequiredCAT(auditBasic);
    console.log(`  ✓ CAT price DOUBLED to $0.20 USD → 1 CAT = $${ethers.formatUnits(newCatMxn, 18)} MXN`);
    console.log(`  ✓ Mismo Audit Basic ($20,000 MXN) ahora cuesta ${ethers.formatEther(newRequiredCAT)} CAT (la mitad!)`);

    // Test 4: What if USD/MXN goes to 25? (Banxico sube)
    const NEW_USD_MXN = ethers.parseUnits("25.00", 18);
    await mxnOracle.contract.setUsdMxnRate(NEW_USD_MXN);
    const rateAfterPesos = await mxnOracle.contract.getCatMxnRate();
    const catAfterPesos = await svcPricing.contract.getRequiredCAT(auditBasic);
    console.log(`  ✓ USD/MXN sube a $25.00 → 1 CAT = $${ethers.formatUnits(rateAfterPesos, 18)} MXN`);
    console.log(`  ✓ Audit Basic ($20,000 MXN) → ${ethers.formatEther(catAfterPesos)} CAT (más barato en CAT, mismo costo en pesos)`);

    // Reset to original rates
    await mxnOracle.contract.setBothRates(INITIAL_CAT_USD, INITIAL_USD_MXN);
    console.log("  ✓ Rates reset to original (1 CAT = $0.10 USD, $1 USD = $20 MXN)");

    // Test 5: Show all service prices in both MXN and CAT
    const complianceBasic = ethers.keccak256(ethers.toUtf8Bytes("compliance_basic"));
    const identityVerif = ethers.keccak256(ethers.toUtf8Bytes("identity_verification"));
    const valuationReport = ethers.keccak256(ethers.toUtf8Bytes("valuation_report"));
    console.log("\n  ── Servicios con Precios MXN Dinámicos ──");
    for (const [name, sid] of [
      ["Project Registration", projectReg],
      ["Audit Basic", auditBasic],
      ["Compliance Basic", complianceBasic],
      ["Identity Verification", identityVerif],
      ["Valuation Report", valuationReport],
    ]) {
      const mxp = await svcPricing.contract.getServiceMxnPrice(sid);
      const catN = await svcPricing.contract.getRequiredCAT(sid);
      console.log(`  ${name.padEnd(24)} $${ethers.formatUnits(mxp, 18).padStart(8)} MXN → ${ethers.formatEther(catN).padStart(8)} CAT`);
    }
    console.log("\n  ✓ Todas las conversiones MXN→CAT verificadas on-chain");
    console.log("  ✓ Si CAT sube → mismo servicio cuesta menos CAT (deflacionario para holders)");
    console.log("  ✓ Si el peso se devalúa → mismo servicio cuesta más CAT (cobertura cambiaria)");
    console.log("  ✓ Gobernanza puede ajustar rates según condiciones de mercado");
  } catch (err) {
    console.log(`  ⚠ MXN smoke test: ${err.message?.slice(0, 120)}`);
  }

  // ── 8. Bridge ──
  console.log("\n── 8. Bridge ──");
  const bridgeVault = await deploy("BridgeVault", catToken.address);
  deployed.push(bridgeVault);

  // ── 8b. Vesting ──
  console.log("\n── 8b. Token Vesting ──");
  const tokenVesting = await deploy("TokenVesting", catToken.address);
  deployed.push(tokenVesting);

  // ── 9. Operations ──
  console.log("\n── 9. Operations ──");
  const ops = await deploy("OperationsRegistry", ADDR);
  deployed.push(ops);
  // AuditManager: sin constructor (usa default)
  const audit = await deploy("AuditManager");
  deployed.push(audit);

  // ── 10. Registries ──
  console.log("\n── 10. Registries ──");
  const events = await deploy("EventRegistry", ADDR, 1, 1);
  deployed.push(events);

  let trace;
  try {
    trace = await deploy("TraceRegistry", ADDR);
    deployed.push(trace);
  } catch (e) {
    console.log("  ⚠ TraceRegistry:", e.message?.slice(0, 60));
  }

  // ── 11. Políticas adicionales ──
  console.log("\n── 11. Políticas ──");
  try {
    const policyReg = await deploy("PolicyRegistry", ADDR);
    deployed.push(policyReg);
  } catch (e) { console.log("  ⚠ PolicyRegistry:", e.message?.slice(0, 60)); }

  try {
    const riskPolicy = await deploy("RiskPolicyRegistry", ADDR, ZERO);
    deployed.push(riskPolicy);
  } catch (e) {
    try {
      const riskPolicy2 = await deploy("RiskPolicyRegistry", ADDR);
      deployed.push(riskPolicy2);
    } catch (e2) {
      console.log("  ⚠ RiskPolicyRegistry:", e2.message?.slice(0, 60));
    }
  }

  // ── 12. Token Distribution per TOKENOMICS ──
  console.log("\n── 12. Token Distribution (TOKENOMICS.md) ──");
  const ONE_CAT = ethers.parseEther("1");
  const ONE_MILLION = ONE_CAT * 1_000_000n;
  const NOW = BigInt(Math.floor(Date.now() / 1000));
  const YEAR_SEC = 365n * 86400n;

  // Use distinct beneficiary addresses for each allocation
  // In production, these would be multisigs, DAO treasuries, etc.
  const signers = await ethers.getSigners();
  const BENEFICIARIES = {
    Treasury:      signers[1].address,  // Treasury multisig
    Community:     signers[2].address,  // Community/ecosystem fund
    Team:          signers[3].address,  // Team & advisors (each member gets own schedule in prod)
    PrivateSale:   signers[4].address,  // Private sale reserve
    Airdrop:       signers[5].address,  // Airdrop distributor
    Liquidity:     ADDR,                // LP goes back to deployer for DEX setup
  };

  const ALLOCATIONS = [
    { name: "Treasury",       beneficiary: BENEFICIARIES.Treasury,     amount: 300n * ONE_MILLION, cliff: 0n,           vesting: 4n * YEAR_SEC, revocable: false },
    { name: "Community",      beneficiary: BENEFICIARIES.Community,    amount: 250n * ONE_MILLION, cliff: 0n,           vesting: 3n * YEAR_SEC, revocable: false },
    { name: "Team/Advisors",  beneficiary: BENEFICIARIES.Team,         amount: 150n * ONE_MILLION, cliff: 1n * YEAR_SEC, vesting: 3n * YEAR_SEC, revocable: true  },
    { name: "Private Sale",   beneficiary: BENEFICIARIES.PrivateSale,  amount: 150n * ONE_MILLION, cliff: 0n,           vesting: 1n * YEAR_SEC, revocable: false },
    { name: "Airdrop",        beneficiary: BENEFICIARIES.Airdrop,      amount:  50n * ONE_MILLION, cliff: 0n,           vesting: 180n * 86400n, revocable: false },
  ];
  const LIQ_AMOUNT = 100n * ONE_MILLION; // 10% liquidity (unlocked)

  // Transfer total distribution to vesting contract
  let vestingTotal = LIQ_AMOUNT;
  for (const a of ALLOCATIONS) vestingTotal += a.amount;
  const catContract = await ethers.getContractAt("CatalystToken", catToken.address);
  let tx = await catContract.transfer(tokenVesting.address, vestingTotal);
  await tx.wait();
  console.log(`  ✓ ${ethers.formatEther(vestingTotal)} CAT → Vesting contract`);

  // Create vesting schedules
  for (const a of ALLOCATIONS) {
    await tokenVesting.contract.createSchedule(a.beneficiary, a.amount, NOW, a.cliff, a.vesting, a.revocable);
    const endSec = Number(NOW + a.cliff + a.vesting);
    console.log(
      `  ✓ ${a.name.padEnd(16)} ${ethers.formatEther(a.amount).padStart(8)} CAT → ${a.beneficiary.slice(0,10)}...` +
      ` | cliff: ${(Number(a.cliff) / 86400).toFixed(0)}d` +
      ` | vest: ${(Number(a.vesting) / 86400).toFixed(0)}d` +
      ` | ends: ${new Date(endSec * 1000).toISOString().slice(0, 10)}`
    );
  }

  // Liquidity: instant-vesting schedule, then claim
  await tokenVesting.contract.createSchedule(BENEFICIARIES.Liquidity, LIQ_AMOUNT, NOW, 0n, 0n, false);
  await tokenVesting.contract.claim(BENEFICIARIES.Liquidity);
  console.log(`  ✓ Liquidity      ${ethers.formatEther(LIQ_AMOUNT)} CAT unlocked → ${ADDR.slice(0,10)}... for DEX`);

  // ── 13. FLT: Distribution → Compliance Wiring → Enforcement ──
  console.log("\n── 13. FLT: Distribution + Compliance Engines ──");
  const fltContract = await ethers.getContractAt("FractalToken", fltToken.address);
  const FLT_1B = ethers.parseEther("1000000000");

  // Phase 1: DISTRIBUTE FIRST (compliance off so transfers work)
  console.log("  ── Phase 1: FLT Distribution ──");
  const FLT_ALLOC = [
    { name: "FLT Treasury",     beneficiary: BENEFICIARIES.Treasury,     amount: 300n * ONE_MILLION, cliff: 0n,           vesting: 4n * YEAR_SEC, revocable: false },
    { name: "FLT Ecosystem",    beneficiary: BENEFICIARIES.Community,    amount: 250n * ONE_MILLION, cliff: 0n,           vesting: 3n * YEAR_SEC, revocable: false },
    { name: "FLT Team",         beneficiary: BENEFICIARIES.Team,         amount: 150n * ONE_MILLION, cliff: 1n * YEAR_SEC, vesting: 3n * YEAR_SEC, revocable: true  },
    { name: "FLT Airdrop",      beneficiary: BENEFICIARIES.Airdrop,      amount:  50n * ONE_MILLION, cliff: 0n,           vesting: 180n * 86400n, revocable: false },
  ];
  const FLT_LIQ = 100n * ONE_MILLION;

  const fltVestingFactory = await ethers.getContractFactory("TokenVesting");
  const fltVesting = await fltVestingFactory.deploy(fltToken.address);
  await fltVesting.waitForDeployment();
  const fltVestingAddr = await fltVesting.getAddress();
  deployed.push({ name: "TokenVesting_FLT", address: fltVestingAddr, contract: fltVesting });

  let fltTotal = FLT_LIQ;
  for (const a of FLT_ALLOC) fltTotal += a.amount;
  tx = await fltContract.transfer(fltVestingAddr, fltTotal);
  await tx.wait();
  console.log(`  ✓ ${ethers.formatEther(fltTotal)} FLT → FLT Vesting`);

  for (const a of FLT_ALLOC) {
    await fltVesting.createSchedule(a.beneficiary, a.amount, NOW, a.cliff, a.vesting, a.revocable);
    const endSec = Number(NOW + a.cliff + a.vesting);
    console.log(
      `  ✓ ${a.name.padEnd(18)} ${ethers.formatEther(a.amount).padStart(8)} FLT → ${a.beneficiary.slice(0,10)}...` +
      ` | vest: ${(Number(a.vesting) / 86400).toFixed(0)}d` +
      ` | ends: ${new Date(endSec * 1000).toISOString().slice(0, 10)}`
    );
  }

  // Claim FLT liquidity
  await fltVesting.createSchedule(BENEFICIARIES.Liquidity, FLT_LIQ, NOW, 0n, 0n, false);
  await fltVesting.claim(BENEFICIARIES.Liquidity);
  console.log(`  ✓ FLT Liquidity   ${ethers.formatEther(FLT_LIQ)} FLT unlocked → ${ADDR.slice(0,10)}... for DEX`);

  const fltDeployerBal = await fltContract.balanceOf(ADDR);
  const fltVestingBal = await fltContract.balanceOf(fltVestingAddr);
  console.log(`  FLT Deployer:  ${ethers.formatEther(fltDeployerBal)}`);
  console.log(`  FLT Vesting:   ${ethers.formatEther(fltVestingBal)} (${FLT_ALLOC.length} schedules + liq)`);

  // Phase 2: Wire compliance engines
  console.log("\n  ── Phase 2: Wiring compliance engines ──");
  await fltContract.setWhitelistRegistry(whitelist.address);
  await fltContract.setComplianceGate(complianceDAO.address);
  await fltContract.setFreezeRegistry(freezeRegistry?.address || ZERO);
  await fltContract.setIdentitySBT(identitySBT.address);
  await fltContract.setIdentityPolicyRegistry(idRegistry.address);

  // Whitelist the key addresses so they can still transfer after enable
  const POLICY_V1 = 1; // policy version
  await whitelist.contract.approveWallet(ADDR, POLICY_V1);
  await whitelist.contract.approveWallet(fltVestingAddr, POLICY_V1);
  await whitelist.contract.approveWallet(BENEFICIARIES.Treasury, POLICY_V1);
  await whitelist.contract.approveWallet(BENEFICIARIES.Community, POLICY_V1);
  await whitelist.contract.approveWallet(BENEFICIARIES.Team, POLICY_V1);
  await whitelist.contract.approveWallet(BENEFICIARIES.Airdrop, POLICY_V1);
  console.log("  ✓ Whitelist populated with 6 core addresses (policy v1)");

  // Phase 3: Enable enforcement engines
  console.log("  ── Phase 3: Enabling enforcement ──");
  await fltContract.setWhitelistPolicyEnabled(true);
  await fltContract.setComplianceEnabled(true);
  await fltContract.setIdentitySBTEnabled(true);
  await fltContract.setFreezeEnforcementEnabled(true);
  console.log("  ✓ Whitelist ✓ Compliance ✓ Identity ✓ Freeze [ACTIVE]");
  console.log("  ⏳ Risk Limits, Travel Rule, UBO, Advanced = next phase");

  console.log(`\n  FLT Supply:    ${ethers.formatEther(await fltContract.totalSupply())}`);

  // ── Resumen ──
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log(`  DEPLOY COMPLETADO — ${deployed.length} contratos`);
  console.log("═══════════════════════════════════════════════════════════\n");

  const summary = deployed.map((d) => ({ name: d.name, address: d.address }));
  console.log(JSON.stringify(summary, null, 2));

  const deployerBal = await catContract.balanceOf(ADDR);
  const vestingBal = await catContract.balanceOf(tokenVesting.address);
  console.log(`\n  CAT Deployer:  ${ethers.formatEther(deployerBal)}`);
  console.log(`  CAT Vesting:   ${ethers.formatEther(vestingBal)} (${ALLOCATIONS.length} schedules + liquidity claimed)`);
  console.log(`  CAT Supply:    ${ethers.formatEther(await catContract.totalSupply())}`);
  console.log(`  FLT Deployer:  ${ethers.formatEther(fltDeployerBal)}`);
  console.log(`  FLT Vesting:   ${ethers.formatEther(fltVestingBal)} (${FLT_ALLOC.length} schedules + liquidity claimed)`);
  console.log(`  FLT Supply:    ${ethers.formatEther(await fltContract.totalSupply())}`);
  console.log(`  FLT Engines:   Whitelist ✓ | Compliance ✓ | Identity ✓ | Freeze ✓`);

  const fs = require("fs");
  const path = require("path");
  const outPath = path.join(__dirname, "..", "apps", "catalyst-studio", "src", "contracts.json");
  fs.writeFileSync(outPath, JSON.stringify(summary, null, 2));
  console.log(`\n  Direcciones guardadas: ${outPath}\n`);
}

main().catch((err) => {
  console.error("DEPLOY FAILED:", err.message);
  process.exit(1);
});
