// List captured controls to help plan a targeted headline follow-up.
const fs = require('node:fs/promises');
const path = require('node:path');
const { excludedControl, validatePlan } = require('./capture.cjs');

async function main() {
  const [inputFile, evidence, planFile] = process.argv.slice(2);
  if (!evidence) throw new Error('Usage: node capture/plan.cjs INPUT.json EVIDENCE [PLAN.json]');
  const read = async file => JSON.parse(await fs.readFile(file, 'utf8'));
  const input = await read(inputFile);
  if (planFile) {
    const plan = await read(planFile);
    validatePlan(plan, input.targets);
    console.log('Validated headline plan for '+Object.keys(plan).length+' entries');
    return;
  }
  for (const {key} of input.targets) {
    const dir = path.join(evidence,key);
    const capture = await read(path.join(dir,'capture.json'));
    if (capture.audit_id !== input.audit_id || capture.runner_revision !== input.runner_revision) {
      throw new Error('Capture provenance differs for '+key);
    }
    const baseline = capture.attempts.findLast(attempt => attempt.ready &&
      attempt.states.some(state => state.id === 'baseline'));
    if (!baseline) continue;
    const state = await read(path.join(dir,baseline.states.find(state => state.id === 'baseline').json));
    const candidates = state.controls.filter(control =>
      (control.tag === 'BUTTON' || ['tab','button'].includes(control.role)) &&
      !control.href && !excludedControl.test([control.text,control.aria,control.target].join(' ')));
    console.log(JSON.stringify({key, file:state.json, candidates}));
  }
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
