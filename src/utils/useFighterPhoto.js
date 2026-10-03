/**
 * useFighterPhoto
 * Fetches a UFC fighter photo from /api/ufc/fighter/<name>/photo on demand.
 * Caches each result in sessionStorage keyed by fighter name.
 *
 * Usage:
 *   const photoUrl = useFighterPhoto('Islam Makhachev');
 *   <img src={photoUrl} alt="Islam Makhachev" />
 */

import { useState, useEffect } from 'react';

const SESSION_PREFIX = 'ufc_photo_';

/**
 * @param {string} name - Fighter display name
 * @returns {string} Photo URL, empty string while loading or if not found
 */
export function useFighterPhoto(name) {
  const sessionKey = `${SESSION_PREFIX}${(name || '').toLowerCase()}`;

  const [photoUrl, setPhotoUrl] = useState(() => {
    try {
      return sessionStorage.getItem(sessionKey) || '';
    } catch {
      return '';
    }
  });

  useEffect(() => {
    if (!name) return;
    // Already cached
    if (photoUrl) return;

    let cancelled = false;
    fetch(`/api/ufc/fighter/${encodeURIComponent(name)}/photo`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        const url = data?.photoUrl || '';
        setPhotoUrl(url);
        if (url) {
          try { sessionStorage.setItem(sessionKey, url); } catch { /* storage full */ }
        }
      })
      .catch(() => {});

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  return photoUrl;
}

export default useFighterPhoto;
