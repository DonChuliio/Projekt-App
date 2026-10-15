export const DEFAULT_REMINDER_TIME = '09:00';
export const reminderDay = (date = new Date()) => [date.getFullYear(), String(date.getMonth()+1).padStart(2,'0'), String(date.getDate()).padStart(2,'0')].join('-');
export const reminderZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Berlin';
export function validateReminder(value) {
 const title = String(value.title || '').trim(), description = String(value.description || '').trim();
 const day = String(value.reminder_date || ''), time = value.reminder_time || null, timezone = String(value.timezone || '').trim();
 if (!title || title.length > 200) throw Error('Bitte einen Titel mit höchstens 200 Zeichen eingeben.');
 if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(Date.parse(day+'T12:00:00Z')) || new Date(day+'T12:00:00Z').toISOString().slice(0,10)!==day) throw Error('Bitte ein gültiges Datum wählen.');
 if (time && !/^(?:[01]\d|2[0-3]):[0-5]\d(?::00)?$/.test(time)) throw Error('Bitte eine gültige Uhrzeit wählen.');
 try { new Intl.DateTimeFormat('de-DE',{timeZone:timezone}); } catch { throw Error('Bitte eine gültige Zeitzone eingeben, zum Beispiel Europe/Berlin.'); }
 if (!timezone) throw Error('Bitte eine Zeitzone angeben.');
 if (description.length > 5000) throw Error('Die Beschreibung darf höchstens 5000 Zeichen enthalten.');
 return {title, reminder_date:day, reminder_time:time ? time.slice(0,5) : null, description, timezone};
}
export function upcomingReminders(rows, day = reminderDay()) {
 return rows.filter(r=>r.reminder_date>=day).sort((a,b)=>a.reminder_date.localeCompare(b.reminder_date)||(a.reminder_time||DEFAULT_REMINDER_TIME).localeCompare(b.reminder_time||DEFAULT_REMINDER_TIME)||a.title.localeCompare(b.title));
}
export function reminderLabel(row) {
 const date = new Date(row.reminder_date+'T12:00:00').toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'});
 return date+(row.reminder_time ? ' · '+row.reminder_time.slice(0,5)+' Uhr' : ' · ohne Uhrzeit')+' · '+row.timezone;
}
export function morningSummary(todos, reminders) {
 if (todos===null || reminders===null) return 'Die Tagesübersicht ist noch nicht vollständig verfügbar.';
 if (!todos && !reminders) return 'Heute sind keine wichtigen To-dos und keine Erinnerungen vorhanden.';
 const parts=[];
 if(todos)parts.push(todos===1?'1 wichtiges To-do':todos+' wichtige To-dos');
 if(reminders)parts.push(reminders===1?'1 Erinnerung':reminders+' Erinnerungen');
 return 'Du hast heute '+parts.join(' und ')+'.';
}
