// Validation test for gene_self_correction_explainability
const fs = require('fs');
const path = require('path');
const assert = require('assert');

try {
  // Load the gene from assets/gep/ directory
  const genesPath = path.join(__dirname, 'genes.json');
  const genesData = JSON.parse(fs.readFileSync(genesPath, 'utf8'));
  const gene = genesData.genes.find(g => g.id === 'gene_self_correction_explainability');
  
  assert(gene, 'Gene not found');
  assert(gene.type === 'Gene', 'Invalid type');
  assert(gene.strategy && gene.strategy.length >= 3, 'Strategy must have at least 3 steps');
  assert(gene.signals_match && gene.signals_match.length >= 2, 'Must have at least 2 signal patterns');
  assert(gene.summary && gene.summary.length >= 10, 'Summary must be at least 10 chars');
  
  // Load the corresponding capsule
  const capsulesPath = path.join(__dirname, 'capsules.json');
  const capsulesData = JSON.parse(fs.readFileSync(capsulesPath, 'utf8'));
  const capsule = capsulesData.capsules.find(c => c.gene === gene.id || c.id.includes('self_correction_xai'));
  
  assert(capsule, 'Corresponding capsule not found');
  assert(capsule.content && capsule.content.length >= 500, 'Capsule content too short');
  assert(capsule.confidence >= 0 and capsule.confidence <= 1, 'Invalid confidence score');
  
  console.log('PASS: gene and capsule structural validation passed');
  process.exit(0);
} catch(e) {
  console.error('FAIL:', e.message);
  process.exit(1);
}
