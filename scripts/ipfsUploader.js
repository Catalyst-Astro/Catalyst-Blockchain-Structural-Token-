const fs = require('fs');
const { create } = require('ipfs-http-client');

/**
 * Upload a signed audit report to IPFS.
 */
async function upload(file) {
  const client = create({ url: process.env.IPFS_API || 'http://localhost:5001' });
  const data = fs.readFileSync(file);
  const { cid } = await client.add(data);
  console.log('Uploaded to IPFS:', cid.toString());
  return cid.toString();
}

if (require.main === module) {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: node ipfsUploader.js <file>');
    process.exit(1);
  }
  upload(file).catch(err => { console.error(err); process.exit(1); });
}
