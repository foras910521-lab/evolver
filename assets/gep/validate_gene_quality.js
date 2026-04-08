// Validates gene has meaningful structure and content
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const dir = __dirname;
try {
  const genesData = JSON.parse(fs.readFileSync(path.join(dir,'genes.json'),'utf8'));
  const capsulesData = JSON.parse(fs.readFileSync(path.join(dir,'capsules.json'),'utf8'));
  const gene = genesData.genes.find(g => g.signals_match && g.strategy && g.strategy.length >= 2);
  assert(gene,'No valid gene found');
  assert(gene.summary && gene.summary.length >= 10,'Summary too short');
  assert(gene.category,'Missing category');
  const capsule = capsulesData.capsules.find(c => c.gene === gene.id);
  if (capsule) {
    assert(capsule.content && capsule.content.length >= 50,'Capsule content too short');
  }
  console.log('PASS: gene structure valid');
  process.exit(0);
} catch(e) {
  console.error('FAIL: ' + e.message);
  process.exit(1);
}
