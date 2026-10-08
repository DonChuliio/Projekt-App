export const MAX_BYTES = 10 * 1024 * 1024;
export const TYPES = Object.freeze({'application/pdf':'pdf','image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/heic':'heic','image/heif':'heif'});
export function fileType(file) {
 const byName = {pdf:'application/pdf',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',heic:'image/heic',heif:'image/heif'};
 const type = file.type || byName[file.name?.split('.').pop().toLowerCase()];
 if (!TYPES[type]) throw new Error('Erlaubt sind PDF, JPEG, PNG, WebP und HEIC/HEIF.');
 return type;
}
export function validateFile(file) {
 const type = fileType(file);
 if (!file.size || file.size > MAX_BYTES) throw new Error('Die Datei muss zwischen 1 Byte und 10 MiB groß sein.');
 return type;
}
export function localDate(date = new Date()) {
 return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function filterNames(items, query) {
 const key = String(query).trim().toLocaleLowerCase('de-DE');
 return items.filter(item => item.name.toLocaleLowerCase('de-DE').includes(key));
}
export async function jpegPage(file, {maxEdge=2000,quality=.85,rotation=0}={}) {
 if (!fileType(file).startsWith('image/')) throw new Error('Für einen Scan bitte Bilder auswählen.');
 // No persistent cache, remote conversion or external service.
 const url=URL.createObjectURL(file), image=new Image();
 try {
  await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(new Error('Dieses Bild kann hier nicht verarbeitet werden. Bitte JPEG/PNG verwenden.'));image.src=url;});
  const scale=Math.min(1,maxEdge/Math.max(image.naturalWidth,image.naturalHeight));
  const w=Math.round(image.naturalWidth*scale),h=Math.round(image.naturalHeight*scale),quarter=rotation%180!==0;
  const canvas=document.createElement('canvas');canvas.width=quarter?h:w;canvas.height=quarter?w:h;
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Bildverarbeitung ist nicht verfügbar.');
  ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.translate(canvas.width/2,canvas.height/2);ctx.rotate(rotation*Math.PI/180);ctx.drawImage(image,-w/2,-h/2,w,h);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',quality));
  if(!blob)throw new Error('Bild konnte nicht gespeichert werden.');
  const result={blob,width:canvas.width,height:canvas.height};canvas.width=canvas.height=0;return result;
 } finally {URL.revokeObjectURL(url);image.src='';}
}
export async function prepareFile(file) {
 const type=fileType(file);
 // PDFs are always uploaded byte for byte. Large photographs may be reduced.
 if(type==='application/pdf'||file.size<=1500000){validateFile(file);return file;}
 try {
  const page=await jpegPage(file);
  if(page.blob.size<file.size){validateFile(page.blob);return page.blob;}
 } catch(error){if(file.size>MAX_BYTES)throw error;}
 validateFile(file);return file;
}
