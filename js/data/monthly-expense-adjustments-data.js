import { SUPABASE_URL, SUPABASE_KEY } from "../config/supabase.js";
import { getValidAccessToken } from "../auth/auth.js";
const URL=`${SUPABASE_URL}/rest/v1/monthly_expense_adjustments`;
async function headers(prefer=null){const token=await getValidAccessToken();const h={"apikey":SUPABASE_KEY,"Authorization":`Bearer ${token}`,"Content-Type":"application/json"};if(prefer)h.Prefer=prefer;return h;}
export async function loadMonthlyAdjustment(monthStart){const r=await fetch(`${URL}?select=salary_adjustment,to_savings,from_savings&month_start=eq.${monthStart}&limit=1`,{headers:await headers()});if(!r.ok){if(r.status===404)return null;throw new Error(`Monatsanpassung konnte nicht geladen werden (${r.status})`);}return (await r.json())[0]||null;}
export async function saveMonthlyAdjustment(monthStart,values){const r=await fetch(`${URL}?on_conflict=user_id,month_start`,{method:"POST",headers:await headers("resolution=merge-duplicates,return=representation"),body:JSON.stringify({month_start:monthStart,...values})});if(!r.ok)throw new Error(`Monatsanpassung konnte nicht gespeichert werden (${r.status}): ${await r.text()}`);return (await r.json())[0];}
