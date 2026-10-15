// Uses the same authenticated processor, VAPID configuration, subscriptions and ledger.
export async function sendReminderPushes(db: any, webpush: any, subscriptions: any[]) {
 const {data: due, error} = await db.rpc('due_planner_reminders');
 if(error)throw error;
 let sent=0;
 for(const reminder of due||[]) for(const subscription of subscriptions.filter(s=>s.user_id===reminder.user_id)) {
  let endpoint: URL;
  try { endpoint=new URL(subscription.endpoint); } catch { continue; }
  const host=endpoint.hostname;
  const allowed=['web.push.apple.com','fcm.googleapis.com','updates.push.services.mozilla.com'].includes(host)||(host.endsWith('.notify.windows.com')&&!host.slice(0,-'.notify.windows.com'.length).includes('.'));
  if(endpoint.protocol!=='https:'||endpoint.username||endpoint.password||(endpoint.port&&endpoint.port!=='443')||!allowed)continue;
  // Recheck current title/date/ownership under the reminder's database row lock.
  const claim=await db.rpc('claim_planner_reminder',{p_reminder:reminder.id,p_subscription:subscription.id});
  if(claim.error)throw claim.error;
  if(!claim.data)continue;
  const row=claim.data,kind='reminder:'+row.id;
  const comment=Array.from(String(row.description||'').trim());
  const body=comment.slice(0,240).join('')+(comment.length>240?'…':'');
  const payload=JSON.stringify({title:row.title,body,target:'reminders',reminderId:row.id,tag:'dock-reminder-'+row.id});
  let status='sent';
  try {
   await webpush.sendNotification({endpoint:subscription.endpoint,keys:{p256dh:subscription.p256dh,auth:subscription.auth}},payload,{TTL:60});
   sent++;
  } catch(error: any) {
   status='failed';
   // No automatic retries after an uncertain send: avoid duplicate notifications.
   if(error?.statusCode===404||error?.statusCode===410)await db.from('push_subscriptions').delete().eq('id',subscription.id);
  }
  const result=await db.from('push_deliveries').update({status,...(status==='sent'?{sent_at:new Date().toISOString()}:{})}).eq('subscription_id',subscription.id).eq('kind',kind).eq('local_date',row.local_date);
  if(result.error)console.error('Erinnerungs-Versandnachweis konnte nicht aktualisiert werden.');
 }
 return sent;
}
