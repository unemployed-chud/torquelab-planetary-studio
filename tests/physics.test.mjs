import test from 'node:test';
import assert from 'node:assert/strict';
import {computeKinematics, PRESETS, MODES} from '../src/physics.mjs';

for(const preset of PRESETS){
  test(`${preset.name}: ring and 3-planet assembly geometry`, () => {
    const k = computeKinematics({...preset});
    assert.equal(k.ring, k.sun + 2*k.planet);
    assert.equal(k.assemblyPossible,true);
  });
  for (const mode of MODES){
    test(`${preset.name}: Willis relation in ${mode.id}`, () => {
      const k=computeKinematics({...preset,mode:mode.id,rpm:1200});
      assert.ok(Math.abs(k.residual)<1e-7);
      assert.ok(Number.isFinite(k.ratio));
    });
  }
}
test('ring-fixed 24:72 yields 4:1 reduction',()=>{
  const k=computeKinematics({sun:24,planet:24,rpm:1200});
  assert.equal(k.output,300);
  assert.equal(k.ratio,4);
  assert.equal(k.wr,0);
});
test('sun-fixed 24:72 yields 4/3:1 reduction',()=>{
  const k=computeKinematics({sun:24,planet:24,rpm:1200,mode:'sun-fixed'});
  assert.equal(k.output,900);
  assert.equal(k.ws,0);
});
test('carrier-fixed reverses ring direction',()=>{
  const k=computeKinematics({sun:24,planet:24,rpm:1200,mode:'carrier-fixed'});
  assert.equal(k.output,-400);
  assert.equal(k.reverse,true);
});
test('invalid parameters rejected',()=>{
  assert.throws(()=>computeKinematics({sun:0}), RangeError);
  assert.throws(()=>computeKinematics({mode:'unknown'}), RangeError);
  assert.throws(()=>computeKinematics({rpm:Infinity}), RangeError);
});
