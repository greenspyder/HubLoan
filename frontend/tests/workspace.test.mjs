import test from 'node:test';
import assert from 'node:assert/strict';
import { addMission, approveMission, createWorkspace, parseWorkspace, simulateMission } from '../src/features/agents/services/workspace.ts';

test('a mission moves from queue to human review and approval without changing previous state', () => {
  const initial = createWorkspace();
  const queued = addMission(initial, '  Launch plan  ', '  Define a digital product  ', 'research');
  const id = queued.missions[0].id;
  const reviewed = simulateMission(queued, id);
  const approved = approveMission(reviewed, id);
  assert.equal(initial.missions.length, 0);
  assert.equal(queued.missions[0].title, 'Launch plan');
  assert.equal(queued.missions[0].status, 'queued');
  assert.equal(reviewed.missions[0].status, 'review');
  assert.match(reviewed.missions[0].output, /SIMULAÇÃO LOCAL/);
  assert.equal(approved.missions[0].status, 'approved');
  assert.deepEqual(parseWorkspace(JSON.stringify(approved)), approved);
});

test('paused agents cannot accept or simulate missions', () => {
  const queued = addMission(createWorkspace(), 'Plan', 'Brief', 'research');
  const paused = { ...queued, agents: queued.agents.map(agent => ({ ...agent, enabled: false })) };
  assert.throws(() => addMission(paused, 'Another', 'Brief', 'research'), /disponível/);
  assert.throws(() => simulateMission(paused, queued.missions[0].id), /Reative/);
});

test('invalid workflow transitions and empty briefings are rejected', () => {
  const initial = createWorkspace();
  assert.throws(() => addMission(initial, ' ', 'Brief', 'research'));
  assert.throws(() => addMission(initial, 'Plan', ' ', 'research'));
  const queued = addMission(initial, 'Plan', 'Brief', 'research');
  assert.throws(() => approveMission(queued, queued.missions[0].id), /revisão/);
  const reviewed = simulateMission(queued, queued.missions[0].id);
  assert.throws(() => simulateMission(reviewed, queued.missions[0].id), /fila/);
});

test('saved workspace validation rejects corrupted data, duplicate IDs and orphaned missions', () => {
  assert.equal(parseWorkspace(null).agents.length, 3);
  assert.throws(() => parseWorkspace('{'));
  assert.throws(() => parseWorkspace('{"version":2,"agents":[],"missions":[]}'));
  const initial = createWorkspace();
  assert.throws(() => parseWorkspace(JSON.stringify({ ...initial, agents: [...initial.agents, initial.agents[0]] })));
  const queued = addMission(initial, 'Plan', 'Brief', 'research');
  assert.throws(() => parseWorkspace(JSON.stringify({ ...queued, agents: [] })));
  assert.throws(() => parseWorkspace(JSON.stringify({ ...queued, missions: [{ ...queued.missions[0], status: 'running' }] })));
});
