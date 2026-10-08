import assert from 'node:assert/strict';
import fs from 'node:fs';
import {MAX_BYTES,validateFile,filterNames,localDate} from '../js/documents/files.js';
import {createScanPdf} from '../js/documents/scan-pdf.js';
assert.equal(validateFile(new Blob(['%PDF-1.4'],{type:'application/pdf'})),'application/pdf');
assert.throws(()=>validateFile(new Blob(['<script>'],{type:'text/html'})));
assert.throws(()=>validateFile(new Blob([new Uint8Array(MAX_BYTES+1)],{type:'application/pdf'})));
assert.throws(()=>validateFile(new Blob([],{type:'application/pdf'})));
assert.equal(localDate(new Date(2026,9,8)),'2026-10-08');
assert.deepEqual(filterNames([{name:'Stromrechnung'},{name:'Miete'}],' STROM '),[{name:'Stromrechnung'}]);
await assert.rejects(createScanPdf([]));
const jpegPath=process.argv[2];
{const jpeg=new Blob([jpegPath?fs.readFileSync(jpegPath):Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCADIAGQDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD3+iiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigD//2Q==','base64')],{type:'image/jpeg'});const pdf=await createScanPdf([{blob:jpeg,width:100,height:200},{blob:jpeg,width:200,height:100}]);if(jpegPath)fs.writeFileSync('tests/synthetic-scan.pdf',Buffer.from(await pdf.arrayBuffer()));const bytes=Buffer.from(await pdf.arrayBuffer());const text=bytes.toString('latin1');assert.match(text,/\/Count 2/);const start=Number(text.match(/startxref\n(\d+)/)[1]);assert.equal(bytes.subarray(start,start+4).toString(),'xref');}
console.log('PASS: file allowlist/size, search, local date, scan input and PDF xref/page generation.');
