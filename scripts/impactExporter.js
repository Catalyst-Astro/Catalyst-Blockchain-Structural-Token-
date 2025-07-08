const { ethers } = require('ethers');
const fs = require('fs');

/**
 * Export impact events and narrative hashes from NarrativeImpactEngine.
 * Usage: node impactExporter.js <rpcUrl> <contractAddress> <projectId> <output>
 */
async function main() {
  const [rpcUrl, contractAddress, projectId, output] = process.argv.slice(2);
  if (!rpcUrl || !contractAddress || !projectId) {
    console.error('Usage: node impactExporter.js <rpcUrl> <contractAddress> <projectId> <output>');
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);

  const abi = [
    'event ImpactEventLogged(uint256 indexed projectId, string eventType, string data)',
    'event NarrativeHashGenerated(uint256 indexed projectId, bytes32 narrativeHash, string format)'
  ];
  const contract = new ethers.Contract(contractAddress, abi, provider);

  const filterEvents = contract.filters.ImpactEventLogged(projectId);
  const impactEvents = await contract.queryFilter(filterEvents);

  const filterReports = contract.filters.NarrativeHashGenerated(projectId);
  const reports = await contract.queryFilter(filterReports);

  const result = {
    projectId: parseInt(projectId, 10),
    events: impactEvents.map(e => ({ eventType: e.args.eventType, data: e.args.data, blockNumber: e.blockNumber })),
    reports: reports.map(r => ({ hash: r.args.narrativeHash, format: r.args.format, blockNumber: r.blockNumber }))
  };

  if (output) {
    fs.writeFileSync(output, JSON.stringify(result, null, 2));
    console.log('Report written to', output);
  } else {
    console.log(JSON.stringify(result, null, 2));
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
