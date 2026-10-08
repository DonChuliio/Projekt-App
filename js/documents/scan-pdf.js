import { MAX_BYTES } from './files.js';
const encode = value => new TextEncoder().encode(value);
// Minimal PDF 1.4 writer: one JPEG per page, no scripts, fonts or dependencies.
export async function createScanPdf(pages) {
 if(!pages.length||pages.length>30)throw new Error('Ein Scan benötigt 1 bis 30 Seiten.');
 const chunks=[encode('%PDF-1.4\n% Dock Scan\n')], offsets=[0];let length=chunks[0].length;
 const append=bytes=>{chunks.push(bytes);length+=bytes.length;};
 const object=(id,parts)=>{offsets[id]=length;append(encode(`${id} 0 obj\n`));for(const part of parts)append(typeof part==='string'?encode(part):part);append(encode('\nendobj\n'));};
 const refs=pages.map((_,i)=>`${3+i*3} 0 R`).join(' ');
 object(1,['<< /Type /Catalog /Pages 2 0 R >>']);object(2,[`<< /Type /Pages /Kids [${refs}] /Count ${pages.length} >>`]);
 for(let i=0;i<pages.length;i++){
  const {blob,width,height}=pages[i];if(blob.type!=='image/jpeg'||!width||!height)throw new Error('Ungültige Scanseite.');
  const id=3+i*3,landscape=width>height,pw=landscape?842:595,ph=landscape?595:842;
  const scale=Math.min((pw-32)/width,(ph-32)/height),w=width*scale,h=height*scale;
  const content=`q\n${w.toFixed(3)} 0 0 ${h.toFixed(3)} ${((pw-w)/2).toFixed(3)} ${((ph-h)/2).toFixed(3)} cm\n/Scan Do\nQ\n`;
  object(id,[`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pw} ${ph}] /Resources << /XObject << /Scan ${id+1} 0 R >> >> /Contents ${id+2} 0 R >>`]);
  const bytes=new Uint8Array(await blob.arrayBuffer());object(id+1,[`<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>\nstream\n`,bytes,'\nendstream']);
  object(id+2,[`<< /Length ${encode(content).length} >>\nstream\n${content}endstream`]);
  if(length>MAX_BYTES)throw new Error('Der Scan überschreitet 10 MiB. Bitte weniger Seiten verwenden.');
 }
 const xref=length,count=3+pages.length*3;
 append(encode(`xref\n0 ${count}\n0000000000 65535 f \n`+offsets.slice(1).map(n=>`${String(n).padStart(10,'0')} 00000 n \n`).join('')+`trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`));
 const pdf=new Blob(chunks,{type:'application/pdf'});if(pdf.size>MAX_BYTES)throw new Error('Der Scan überschreitet 10 MiB.');return pdf;
}
