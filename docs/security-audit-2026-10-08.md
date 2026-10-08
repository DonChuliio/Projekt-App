# Dock: Sicherheitsprüfung und Dokumentenspeicher (08.10.2026)

## Umfang und Ergebnis

Geprüft wurden der aktuelle GitHub-Stand v1.60, alle 16 bestehenden öffentlichen Tabellen und ihre RLS-Regeln, die vorhandenen drei Edge Functions, Cron, Auth-Client und Storage-Konfiguration. Die Änderungen bereiten ausschließlich den Speicher vor; es gibt keine Dokumentenoberfläche, keine KI-Übertragung und keinen neuen kostenpflichtigen Dienst.

Die vier SQL-Dateien unter database/ wurden in dieser Reihenfolge auf dem vorhandenen Supabase-Projekt angewendet:
1. secure_export_and_push_ownership.sql
2. prepare_private_document_bucket.sql
3. protect_push_cron.sql
4. remove_client_truncate_privileges.sql

Sie dokumentieren einmalige Migrationen und dürfen nicht unkontrolliert erneut ausgeführt werden. Die Edge Functions wurden ebenfalls aktualisiert. Die Client-Änderungen bilden v1.61.

## Gefundene und behobene Probleme

| Befund | Änderung |
|---|---|
| Anonyme Inserts in push_subscriptions waren erlaubt. | Die permissive anonyme Policy wurde entfernt. Angemeldete Benutzer bleiben auf ihre eigenen Abonnements beschränkt. |
| bring_exports erlaubte allen angemeldeten Benutzern Zugriff ohne Eigentümerprüfung. | user_id und eigene SELECT/INSERT-Policies; Exporte sind höchstens 30 Minuten gültig, mit begrenzter Anzahl und Namenslänge. |
| swift-processor war ohne Aufrufberechtigung erreichbar. | POST und serverseitig geprüfter Cron-Token; nur Hash in privater Tabelle, Original im Vault, RPC nur für service_role. |
| Push-Endpunkte konnten beliebige Ziele enthalten. | Datenbank- und Server-Allowlist für bekannte HTTPS-Push-Anbieter, keine URL-Anmeldedaten oder abweichenden Ports. |
| Anonyme und angemeldete Client-Rollen hatten TRUNCATE-Rechte auf Anwendungstabellen. | Für sämtliche 16 öffentlichen Anwendungstabellen entzogen. Gewöhnliche CRUD-Rechte und RLS bleiben erhalten. |
| Abmeldung war nur lokal; eine laufende Erneuerung konnte die Sitzung wiederherstellen. | Server-Logout mit scope=local, Generationserkennung gegen verspätete Refresh-Antworten, feste Ablaufzeit und Entfernung ungültiger Sitzungen. Abmeldung blendet die App sofort aus und lädt sie anschließend neu. |
| Die App war initial vor der Auth-Prüfung sichtbar; CSP fehlte. | Initial ausgeblendete App, restriktive CSP für Skripte und Verbindungen, no-referrer. |
| Öffentliche Bring-Importseiten hatten unzureichende Request-/Browser-Schutzvorgaben. | Methoden-/UUID-Prüfung, no-store, no-referrer, nosniff und noindex. Bestehendes HTML-/JSON-Escaping bleibt erhalten. |
| Für push_deliveries fehlte eine explizite Policy. | Ausschließlich service_role; Client-Zugriff bleibt gesperrt. |

Bestehende Exporte ohne Eigentümer wurden nicht einem Benutzer zugeschrieben oder gelöscht. Sie bleiben für Clients unsichtbar; ihre bestehenden Ablaufzeiten gelten weiter. Die bewusst öffentlichen, kurzlebigen UUID-Links der Bring-Integration bleiben zur Erhaltung dieser Funktion bestehen. Das sind Einkaufslisten-Exporte, keine Dokumenten-URLs.

## Vertrag für das spätere Dokumentenmodul

- Bucket: dock-documents, privat, maximal 10 MiB pro Datei.
- Erlaubte MIME-Typen: application/pdf, image/jpeg, image/png, image/webp, image/heic, image/heif.
- Neue Pfade: <auth.uid()>/<kleingeschriebene UUID>.<pdf|jpg|jpeg|png|webp|heic|heif>. Keine Originaldateinamen im Speicherpfad.
- SELECT/DELETE benötigen den eigenen Benutzerordner; INSERT/UPDATE prüfen zusätzlich Pfad, MIME-Typ und Größe. UPDATE darf nicht in einen fremden Ordner verschieben.
- Künftige Downloads über authentifizierte Storage-Aufrufe. Keine getPublicUrl-Aufrufe. Falls später signierte URLs verwendet werden, sind diese zeitlich begrenzte Bearer-Links und dürfen nicht weitergegeben werden.
- Dokumentoperationen mit Benutzer-JWT, niemals mit einem service_role-/Secret-Key im Frontend. Service-Rollen umgehen RLS und gehören ausschließlich auf den Server.
- Keine Dokumentinhalte an externe KI-Dienste übertragen. Diese Änderung enthält keinerlei Übertragungscode.

MIME-Prüfung und Dateiendung sind keine Inhalts-, Viren- oder PDF-Skriptprüfung. Vor dem Dokumentenmodul sollte festgelegt werden, wie aktive Inhalte dargestellt werden; HTML und SVG sind ausgeschlossen. Der Speicher ist nicht Ende-zu-Ende verschlüsselt.

## Durchgeführte Tests

### Datenbank, live mit Rollback

tests/security-policies.sql prüft mit authenticated- und anon-Rollen:
- Eigene Dokument-Metadaten anlegen, lesen und aktualisieren.
- Fremde Dokumente nicht lesen, verändern, anlegen oder durch Verschieben erreichen.
- Anonyme Lese-/Insert-Zugriffe verweigern.
- HTML, übergroße Dateien und fremde Pfade verweigern.
- Eigene Bring-Exporte zulassen; fremde Eigentümer und überlange Gültigkeit verweigern.
- Anonyme Push-Registrierung verweigern.

Diese Tests verwenden temporäre Storage-Metadaten innerhalb einer zurückgerollten Transaktion, keine echten Datei-Uploads. Danach befinden sich null Dokumentobjekte im Bucket. Direkte SQL-DELETEs sind durch Supabases Storage-Schutz gesperrt; ein echter Löschtest muss über die Storage-API erfolgen.

Zusätzlich geprüft: RLS auf allen öffentlichen Tabellen aktiv; keine Client-TRUNCATE-Rechte auf öffentlichen Tabellen; Cron-RPC für authenticated nicht ausführbar; richtiger Vault-Token wird akzeptiert, falscher Token abgelehnt. Cron bleibt bei 0 7,8 * * * mit 09-Uhr-Prüfung in Europe/Berlin und täglichem Versandnachweis.

### Lokale Regressionstests

Mit Node 24:
```sh
node tests/auth-security.test.cjs
node tests/push-edge.test.cjs
node tests/export-security.test.cjs
```

Erfolgreich: nur ein paralleler Refresh, feste Ablaufzeit, kein Wiederherstellen nach Logout, serverseitiger Logout-Aufruf, Entfernen ungültiger Sitzungen; fehlender/falscher Cron-Token und falsche Methode gesperrt; Sommer-/Winterzeit inklusive Umstellungstage, Versand-Deduplizierung, Routine-To-dos, erledigte Aufgaben, Finanztermine inklusive Schaltjahr; Bring-UUID/Methoden, Ablaufprüfung und Escaping.

Diese Tests mocken HTTP/SDK-Aufrufe; sie versenden keine Pushs und ersetzen keinen vollständigen Browser-/Gerätetest.

### Schlüssel und Advisors

Im aktuellen Textbestand des Repositorys wurden keine geheimen Schlüssel, service_role-JWTs oder privaten Schlüssel gefunden. Der öffentliche Supabase Publishable Key ist erwartbar und kein Geheimnis. Zusätzlich wurden die Versionen von js/config/supabase.js in den letzten 100 Commits untersucht, ohne Geheimnisfund. Das ist kein vollständiger Scan aller historischen Dateien oder bereits gelöschter Git-Objekte.

Supabase Security Advisors: nach den Änderungen ausschließlich die Warnung zu deaktiviertem Leaked Password Protection. Die offizielle Dokumentation setzt dafür mindestens den Pro-Plan voraus; wegen der Vorgabe keine kostenpflichtigen Dienste wurde nichts gebucht:
https://supabase.com/docs/guides/auth/password-security

## Offene Punkte und Grenzen

1. Echte Storage-API-Tests (eigener/fremder/anon Download, Upload/Überschreiben/Löschen sowie echte MIME-/Größenablehnung) sind noch nicht ausgeführt. Die automatische Freigabeprüfung lehnte den geplanten temporären privilegierten Produktions-Testendpunkt mit zwei temporären Auth-Benutzern und anschließender Bereinigung ab. Der Endpunkt wurde nicht bereitgestellt; es wurden dafür keine Testbenutzer oder Dateien angelegt.
2. Für einen vollständigen Abschluss: freigegebener, beaufsichtigter API-Test mit zwei temporären verifizierten Testkonten, ohne E-Mail-Versand, ausschließlich synthetischen Dateien und vollständiger Bereinigung. Keine vorhandenen Konten oder Dateien verändern.
3. Sitzungen liegen weiterhin im localStorage; CSP reduziert XSS-Risiken, beseitigt sie aber nicht. Ein bereits ausgestellter Access-JWT kann bis zum Ablauf gültig bleiben, auch wenn der Refresh-Token widerrufen ist. MFA und aktive Sitzungsprüfungen für Dokumentzugriffe sind nicht implementiert.
4. Leaked Password Protection bleibt deaktiviert.
5. Supabase verwaltet storage.objects mit dem Eigentümer supabase_storage_admin. Dort verblieben platformseitige TRUNCATE-Grants für anon/authenticated trotz angefragtem REVOKE. Keine öffentlich erreichbare TRUNCATE-RPC wurde gefunden; die normalen Storage-API-Zugriffe unterliegen den getesteten RLS-Regeln. Diese administrativen Grants dürfen nicht als entfernt bezeichnet werden.
6. Kein Virenscanner, keine Inhaltsvalidierung und keine Ende-zu-Ende-Verschlüsselung. Vor Speicherung besonders vertraulicher Dokumente diese Grenzen und die noch ausstehenden API-Tests bewerten.

Bestehende Daten wurden erhalten; keine Dokumenten-UI, keine zusätzlichen Benachrichtigungen und keine Designänderungen wurden eingeführt.
