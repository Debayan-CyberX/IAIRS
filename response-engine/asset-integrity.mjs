import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const manifest=JSON.parse(await readFile('.openai/asset-inventory.json','utf8'));
const walk=async path=>{const files=[];for(const entry of await readdir(path,{withFileTypes:true})){const name=`${path}/${entry.name}`;files.push(...(entry.isDirectory()?await walk(name):[name]));}return files;};
assert.deepEqual((await walk('public')).sort(),manifest.assets.map(a=>a.path).sort(),'Public asset inventory changed.');
for(const asset of manifest.assets){const bytes=await readFile(asset.path);assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256,`Asset modified: ${asset.path}`);}
console.log(`PASS ${manifest.assets.length} recorded public assets match their SHA-256 hashes.`);
