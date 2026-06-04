/* ================================================================
   천문 — 리포트 PDF 영속 저장 (IndexedDB)
   signature / study 는 1개(덮어쓰기), gunghap 은 상대 이름별로 여러 개 저장.
   키 규칙: 'signature' | 'study' | `gunghap::{상대이름}`
   앱을 껐다 켜도 재다운로드 가능.
================================================================ */
const DB_NAME = 'cm_reports';
const STORE   = 'pdf';
const DB_VER  = 2;

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('no-indexeddb')); return; }
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror  = () => reject(req.error);
  });
}

const GUNGHAP_PREFIX = 'gunghap::';
/* 저장 키 — 궁합은 상대 이름으로 구분(여러 개 공존). 그 외는 type 그대로. */
export const reportKey = (type, name) =>
  type === 'gunghap' ? `${GUNGHAP_PREFIX}${String(name || '상대').trim() || '상대'}` : type;

/* type: 'signature' | 'study' | 'gunghap'. gunghap이면 name으로 키 구분. */
export async function savePdf(blob, type = 'signature', name = null) {
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(blob, reportKey(type, name));
      tx.oncomplete = resolve;
      tx.onerror    = () => reject(tx.error);
    });
    return true;
  } catch (e) { return false; }
}

export async function loadPdf(type = 'signature', name = null) {
  try {
    const db = await openDb();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE, 'readonly');
      const g  = tx.objectStore(STORE).get(reportKey(type, name));
      g.onsuccess = () => resolve(g.result || null);
      g.onerror   = () => resolve(null);
    });
  } catch (e) { return null; }
}

export async function clearPdf(type = 'signature', name = null) {
  try {
    const db = await openDb();
    await new Promise((resolve) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(reportKey(type, name));
      tx.oncomplete = resolve;
      tx.onerror    = resolve;
    });
  } catch (e) { /* 무시 */ }
}

/* 저장된 모든 리포트 메타 반환 — 보관 목록용.
   [{ type, name }] · signature/study는 name=null, gunghap은 상대 이름. */
export async function listSavedReports() {
  try {
    const db = await openDb();
    const keys = await new Promise((resolve) => {
      const tx = db.transaction(STORE, 'readonly');
      const g  = tx.objectStore(STORE).getAllKeys();
      g.onsuccess = () => resolve(g.result || []);
      g.onerror   = () => resolve([]);
    });
    return keys.map((k) => {
      if (k === 'signature' || k === 'study') return { type: k, name: null };
      if (typeof k === 'string' && k.startsWith(GUNGHAP_PREFIX)) return { type: 'gunghap', name: k.slice(GUNGHAP_PREFIX.length) };
      if (k === 'gunghap') return { type: 'gunghap', name: null }; // 구버전 단일 키 호환
      return null;
    }).filter(Boolean);
  } catch (e) { return []; }
}
