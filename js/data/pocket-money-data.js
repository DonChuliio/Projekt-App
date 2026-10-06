import { SUPABASE_URL, SUPABASE_KEY } from "../config/supabase.js";
import { getValidAccessToken } from "../auth/auth.js";
const U=`${SUPABASE_URL}/rest/v1/pocket_money_expenses`;
async function h(p=null){const t=await getValidAccessToken(),x={"apikey":SUPABASE_KEY,"Authorization":`Bearer ${t}`,"Content-Type":"application/json"};if(p)x.Prefer=p;return x;}
export async function loadPocketMoneyExpenses(){const r=await fetch(`${U}?select=id,name,amount,expense_date&order=expense_date.desc,created_at.desc`,{headers:await h()});if(!r.ok)throw Error(await r.text());return r.json();}
export async function addPocketMoneyExpense(v){const r=await fetch(U,{method:"POST",headers:await h("return=representation"),body:JSON.stringify(v)});if(!r.ok)throw Error(await r.text());return (await r.json())[0];}
export async function deletePocketMoneyExpense(id){const r=await fetch(`${U}?id=eq.${id}`,{method:"DELETE",headers:await h()});if(!r.ok)throw Error(await r.text());}
