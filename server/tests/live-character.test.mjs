import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createLumeFace} from '../live-worker/lume-face.mjs';
test('three distinct original silhouettes, bounded reusable geometry and audio driven jaw',()=>{
 const silhouettes=[];
 for(const design of ['jade','pearl','ember']){
  const face=createLumeFace(THREE,'#71dca0',design);silhouettes.push(face.skull.scale.toArray().join(','));
  const geometries=new Set();face.g.traverse(o=>{if(o.geometry)geometries.add(o.geometry);});assert.equal(geometries.size,3);assert.equal(face.inspect().geometryCount,geometries.size);
  for(let i=0;i<50;i++)face.animate(i*40,0,false,false,'neutral');const silent=face.inspect().jawOpen;
  for(let i=50;i<100;i++)face.animate(i*40,.8,false,false,'neutral');assert.ok(face.inspect().jawOpen>silent+.3);
  for(let i=100;i<160;i++)face.animate(i*40,0,false,false,'neutral');assert.ok(face.inspect().jawOpen<.01);
  for(const emotion of ['happy','surprise','irritated','confident','teasing','sad','celebrating','fear','focused','laughing']){face.animate(7000,0,false,false,emotion);assert.equal(face.inspect().expression,emotion);}
  assert.equal(face.inspect().lipSync,'audio-envelope');
 }
 assert.equal(new Set(silhouettes).size,3);
});
