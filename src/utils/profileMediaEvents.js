export const PROFILE_MEDIA_UPDATED_EVENT = "profile:media-updated";

export function emitProfileMediaUpdated(detail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(PROFILE_MEDIA_UPDATED_EVENT, {
      detail,
    })
  );
}

export function onProfileMediaUpdated(handler) {
  if (typeof window === "undefined") return () => {};

  const wrapped = (event) => {
    handler?.(event?.detail);
  };

  window.addEventListener(PROFILE_MEDIA_UPDATED_EVENT, wrapped);
  return () => window.removeEventListener(PROFILE_MEDIA_UPDATED_EVENT, wrapped);
}
