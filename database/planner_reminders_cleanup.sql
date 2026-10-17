-- Superseded by Issue 32: reminders are retained permanently, including failures.
-- Also safe when this historical setup file is reapplied: NEVER restore deletion.
select cron.unschedule(jobid) from cron.job where jobname='dock-reminders-cleanup';
