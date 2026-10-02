import sharp from 'sharp';
import validator from 'gltf-validator';
import { AppError, text } from './domain.mjs';
export function parseFurniture(output) {
  let data; try { data = JSON.parse(output.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')); } catch { throw new AppError('Especificação 3D inválida.'); }
  if (!Array.isArray(data.parts) || data.parts.length < 1 || data.parts.length > 60) throw new AppError('Modelo 3D deve ter de uma a sessenta peças.');
  if (!Array.isArray(data.materials) || !data.materials.length || data.materials.length > 4) throw new AppError('Escolha de um a quatro materiais.');
  const materials = data.materials.map(m => ({ name: text(m.name, 'Material', 40), color: /^#[a-f0-9]{6}$/i.test(m.color || '') ? m.color : (() => { throw new AppError('Cor inválida.'); })(), pattern: m.pattern === 'wood' ? 'wood' : 'solid' }));
  const parts = data.parts.map((part, i) => {
    const vector = (v, positive) => { if (!Array.isArray(v) || v.length !== 3 || v.some(n => !Number.isFinite(n) || Math.abs(n) > 20 || (positive && n < 0.005))) throw new AppError('Dimensões ou posições 3D inválidas.'); return v; };
    if (!Number.isInteger(part.material) || part.material < 0 || part.material >= materials.length) throw new AppError('Índice de material inválido.');
    return { name: `part-${i + 1}`, size: vector(part.size, true), position: vector(part.position, false), material: part.material };
  });
  return { title: text(data.title, 'Nome do modelo', 100), materials, parts };
}
const faces = [
  { n: [1,0,0], p: [[.5,-.5,-.5],[.5,.5,-.5],[.5,.5,.5],[.5,-.5,.5]] },
  { n: [-1,0,0], p: [[-.5,-.5,.5],[-.5,.5,.5],[-.5,.5,-.5],[-.5,-.5,-.5]] },
  { n: [0,1,0], p: [[-.5,.5,-.5],[-.5,.5,.5],[.5,.5,.5],[.5,.5,-.5]] },
  { n: [0,-1,0], p: [[-.5,-.5,.5],[-.5,-.5,-.5],[.5,-.5,-.5],[.5,-.5,.5]] },
  { n: [0,0,1], p: [[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5],[-.5,-.5,.5]] },
  { n: [0,0,-1], p: [[-.5,-.5,-.5],[-.5,.5,-.5],[.5,.5,-.5],[.5,-.5,-.5]] },
];
export async function buildFurniture(spec) {
  const chunks = [], bufferViews = [], accessors = []; let length = 0;
  function add(buffer, target) { const padding = (4 - length % 4) % 4; if (padding) { chunks.push(Buffer.alloc(padding)); length += padding; } const index = bufferViews.length; bufferViews.push({ buffer: 0, byteOffset: length, byteLength: buffer.length, ...(target ? { target } : {}) }); chunks.push(buffer); length += buffer.length; return index; }
  function accessor(array, componentType, type, count, extra = {}, target = 34962) { const index = accessors.length; accessors.push({ bufferView: add(Buffer.from(array.buffer), target), componentType, type, count, ...extra }); return index; }
  const positions = new Float32Array(faces.flatMap(face => face.p.flat()));
  const normals = new Float32Array(faces.flatMap(face => Array(4).fill(face.n).flat()));
  const uvs = new Float32Array(Array(6).fill([0,0,1,0,1,1,0,1]).flat());
  const indices = new Uint16Array(faces.flatMap((_face, index) => [0,1,2,0,2,3].map(v => v + index * 4)));
  const position = accessor(positions,5126,'VEC3',24,{min:[-.5,-.5,-.5],max:[.5,.5,.5]});
  const normal = accessor(normals,5126,'VEC3',24); const uv = accessor(uvs,5126,'VEC2',24); const ix = accessor(indices,5123,'SCALAR',36,{},34963);
  const images = [], textureFiles = {};
  for (let i = 0; i < spec.materials.length; i++) {
    const m = spec.materials[i], color = [1,3,5].map(start => parseInt(m.color.slice(start,start+2),16)), pixels = Buffer.alloc(16*16*3);
    for (let y=0;y<16;y++) for(let x=0;x<16;x++) for(let c=0;c<3;c++) pixels[(y*16+x)*3+c] = Math.round(color[c]*(m.pattern === 'wood' ? .75 + ((y*7+x*3)%11)/44 : 1));
    const png = await sharp(pixels,{raw:{width:16,height:16,channels:3}}).png().toBuffer(); textureFiles[`textures/material-${i+1}.png`] = png;
    images.push({bufferView:add(png),mimeType:'image/png'});
  }
  const json = {asset:{version:'2.0',generator:'HubLoan constrained procedural furniture'},scene:0,scenes:[{nodes:spec.parts.map((_p,i)=>i)}],nodes:spec.parts.map((p,i)=>({name:p.name,mesh:i,translation:p.position,scale:p.size})),meshes:spec.parts.map(p=>({primitives:[{attributes:{POSITION:position,NORMAL:normal,TEXCOORD_0:uv},indices:ix,material:p.material}]})),materials:spec.materials.map((m,i)=>({name:m.name,pbrMetallicRoughness:{baseColorTexture:{index:i},metallicFactor:0,roughnessFactor:.8}})),textures:images.map((_img,i)=>({sampler:0,source:i})),samplers:[{magFilter:9728,minFilter:9728,wrapS:10497,wrapT:10497}],images,accessors,bufferViews,buffers:[{byteLength:length}]};
  const jsonRaw=Buffer.from(JSON.stringify(json)),jsonChunk=Buffer.concat([jsonRaw,Buffer.alloc((4-jsonRaw.length%4)%4,32)]),bin=Buffer.concat(chunks),binChunk=Buffer.concat([bin,Buffer.alloc((4-bin.length%4)%4)]);
  const header=Buffer.alloc(12); header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(12+8+jsonChunk.length+8+binChunk.length,8);
  const jh=Buffer.alloc(8);jh.writeUInt32LE(jsonChunk.length);jh.writeUInt32LE(0x4e4f534a,4);const bh=Buffer.alloc(8);bh.writeUInt32LE(binChunk.length);bh.writeUInt32LE(0x004e4942,4);
  const glb=Buffer.concat([header,jh,jsonChunk,bh,binChunk]);
  const report=await validator.validateBytes(new Uint8Array(glb),{uri:'model.glb',maxIssues:100});
  if(report.issues.numErrors) throw new AppError('A validação glTF encontrou erros. Modelo não entregue.');
  let obj='mtllib model.mtl\n',offset=0;const polygons=[];
  for(const part of spec.parts){obj+=`o ${part.name}\nusemtl material-${part.material+1}\n`; for(const face of faces)for(const p of face.p)obj+=`v ${p.map((v,c)=>v*part.size[c]+part.position[c]).join(' ')}\n`;
    for(const face of faces)for(let i=0;i<4;i++)obj+=`vn ${face.n.join(' ')}\n`; for(let i=0;i<6;i++)obj+='vt 0 0\nvt 1 0\nvt 1 1\nvt 0 1\n';
    for(let f=0;f<6;f++){const verts=[0,1,2,3].map(v=>offset+f*4+v+1);obj+=`f ${verts.map(v=>`${v}/${v}/${v}`).join(' ')}\n`;const points=faces[f].p.map(p=>p.map((v,c)=>v*part.size[c]+part.position[c]));polygons.push({points,color:spec.materials[part.material].color,depth:points.reduce((a,p)=>a+p[0]+p[2],0)});}offset+=24;
  }
  const project=p=>[(p[0]-p[2])*.707,(p[0]+p[2])*.35-p[1]];const projected=polygons.flatMap(poly=>poly.points.map(project));const min=[0,1].map(c=>Math.min(...projected.map(p=>p[c]))),max=[0,1].map(c=>Math.max(...projected.map(p=>p[c])));const scale=Math.min(650/(max[0]-min[0]||1),650/(max[1]-min[1]||1));
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800"><rect width="800" height="800" fill="#14231a"/>${polygons.sort((a,b)=>a.depth-b.depth).map(poly=>`<polygon points="${poly.points.map(p=>{const xy=project(p);return `${75+(xy[0]-min[0])*scale},${75+(xy[1]-min[1])*scale}`;}).join(' ')}" fill="${poly.color}" stroke="#223326" stroke-width="1"/>`).join('')}</svg>`;
  const preview=await sharp(Buffer.from(svg)).png().toBuffer();
  const mtl=spec.materials.map((m,i)=>`newmtl material-${i+1}\nKd 1 1 1\nmap_Kd textures/material-${i+1}.png\n`).join('\n');
  return {files:{'model.glb':glb,'model.obj':Buffer.from(obj),'model.mtl':Buffer.from(mtl),...textureFiles,'source.json':Buffer.from(JSON.stringify(spec,null,2)),'validation.json':Buffer.from(JSON.stringify(report,null,2))},preview,report,triangles:spec.parts.length*12};
}
