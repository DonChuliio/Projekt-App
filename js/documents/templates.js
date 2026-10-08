// Optional values; stable field keys keep template changes from destroying saved data.
export const TEMPLATES=Object.freeze({
 general:{name:'Allgemein',fields:[['sender','Stelle / Absender'],['reference','Referenznummer'],['notes','Notizen','textarea']]},
 contract:{name:'Vertrag',fields:[['provider','Anbieter'],['contract_number','Vertragsnummer'],['cost','Kosten'],['payment_interval','Zahlungsintervall'],['start','Beginn','date'],['minimum_term','Mindestlaufzeit'],['cancellation','Kündigungsfrist'],['price_changes','Preisänderungen','textarea']]},
 insurance:{name:'Versicherung',fields:[['provider','Versicherer'],['policy_number','Policennummer'],['premium','Beitrag'],['payment_interval','Zahlungsintervall'],['start','Beginn','date'],['cancellation','Kündigungsfrist']]},
 purchase:{name:'Anschaffung',fields:[['manufacturer','Hersteller'],['model','Modell'],['purchase_price','Kaufpreis'],['purchase_date','Kaufdatum','date'],['retailer','Händler'],['serial_number','Seriennummer'],['warranty_end','Garantieende','date']]},
 pension:{name:'Altersvorsorge',fields:[['provider','Träger'],['pension_type','Vorsorgeart'],['contract_number','Vertragsnummer'],['contributions','Beiträge'],['pension_start','Rentenbeginn']]},
 work:{name:'Arbeit & Steuern',fields:[['authority','Arbeitgeber / Behörde'],['document_type','Dokumentart'],['period','Jahr / Zeitraum'],['reference','Referenznummer']]},
 housing:{name:'Wohnen & Versorgung',fields:[['provider','Anbieter / Vermieter'],['contract_type','Vertragsart'],['customer_number','Kundennummer'],['meter_number','Zählernummer'],['installment','Abschlag'],['billing_period','Abrechnungszeitraum']]}
});
export function descendants(folders,id){const found=new Set([id]);let changed=true;while(changed){changed=false;for(const f of folders)if(found.has(f.parent_id)&&!found.has(f.id)){found.add(f.id);changed=true;}}return found;}
export function folderPath(folders,id){const parts=[],seen=new Set();while(id&&!seen.has(id)){seen.add(id);const f=folders.find(item=>item.id===id);if(!f)break;parts.unshift(f.name);id=f.parent_id;}return parts.join(' / ')||'Ohne Ordner';}
export function validateCollection({name,template,fields,custom_fields}){
 if(!name?.trim()||name.length>200||!TEMPLATES[template])throw new Error('Bitte eine gültige Bezeichnung und Vorlage wählen.');
 if(!fields||Array.isArray(fields)||typeof fields!=='object'||!Array.isArray(custom_fields)||custom_fields.length>50)throw new Error('Ungültige Ablagedaten.');
 if(Object.values(fields).some(v=>typeof v!=='string'||v.length>4000)||custom_fields.some(f=>!f.id||typeof f.label!=='string'||!f.label.trim()||f.label.length>160||typeof f.value!=='string'||f.value.length>4000))throw new Error('Eigene Felder benötigen eine Bezeichnung; Werte dürfen maximal 4000 Zeichen enthalten.');
 if(new TextEncoder().encode(JSON.stringify(fields)).length>65536||new TextEncoder().encode(JSON.stringify(custom_fields)).length>65536)throw new Error('Die Stammdaten überschreiten das Größenlimit.');
 return true;
}
