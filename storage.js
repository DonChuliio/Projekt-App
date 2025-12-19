/*
 Speichert einen Wert unter einem Key.
 Der Wert wird als JSON gespeichert, damit auch Objekte möglich sind.
*/
export function save(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

/*
 Lädt einen Wert aus dem Storage.
 Wenn nichts vorhanden ist, wird ein Fallback zurückgegeben.
*/
export function load(key, fallback = null) {
    const raw = localStorage.getItem(key);

    // Wenn nichts gespeichert ist → Fallback zurückgeben
    if (raw === null) {
        return fallback;
    }

    // JSON wieder in ein JS-Objekt umwandeln
    return JSON.parse(raw);
}

/*
 Entfernt einen Eintrag aus dem Storage
*/
export function remove(key) {
    localStorage.removeItem(key);
}
