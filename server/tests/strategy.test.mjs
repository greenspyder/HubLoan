import test from 'node:test';
import assert from 'node:assert/strict';
import { createProvider } from '../provider.mjs';
import { BUSINESS_DIRECTIVE, businessStrategy } from '../strategy.mjs';
import { marketSettings } from '../market.mjs';
import { SPECIALIZATIONS, availableSpecializations, productionCalls } from '../specializations.mjs';
import { initialWorkspace, publicWorkspace } from '../domain.mjs';

test('business directive reaches research, text and vision calls without replacing task instructions', async () => {
  const bodies = [];
  const provider = createProvider(async (_, request) => {
    bodies.push(JSON.parse(request.body));
    return new Response(JSON.stringify({ output: [{ content: [{ type: 'output_text', text: 'ok' }] }] }), { status: 200 });
  });
  await provider.text('test', 'model', 'Tarefa específica', 'brief', 100);
  await provider.research('test', 'model', 'novas oportunidades');
  await provider.vision('test', 'model', 'Revisar transparência', 'brief', [Buffer.from('image')]);
  assert.equal(bodies.length, 3);
  for (const body of bodies) assert.ok(body.instructions.startsWith(BUSINESS_DIRECTIVE));
  assert.ok(bodies[0].instructions.includes('Tarefa específica'));
  assert.ok(bodies[2].instructions.includes('Revisar transparência'));
});

test('broader opportunities work without image consent and publish a truthful future capability', () => {
  const settings = marketSettings({ specializations: ['text', 'model3d', 'thumbnail'], allowImages: false });
  assert.deepEqual(availableSpecializations(settings), ['text', 'model3d']);
  assert.equal(productionCalls('text'), 3);
  assert.equal(SPECIALIZATIONS.text.images, false);
  const workspace = publicWorkspace(initialWorkspace(), 'memory');
  assert.deepEqual(workspace.strategy, businessStrategy);
  assert.equal(workspace.strategy.selfImprovement, 'draft-pr');
});
