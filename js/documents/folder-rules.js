// The existing stable default key identifies Sonstiges, independent of labels.
export function allowsSubfolders(folders,id){
 const seen=new Set();
 while(id&&!seen.has(id)){
  seen.add(id);const folder=folders.find(f=>f.id===id);if(!folder)return false;
  if(folder.default_key)return folder.default_key==='other';
  id=folder.parent_id;
 }
 return false;
}
export function subfolderParents(folders,exclude=new Set()){
 return folders.filter(f=>!exclude.has(f.id)&&allowsSubfolders(folders,f.id));
}
