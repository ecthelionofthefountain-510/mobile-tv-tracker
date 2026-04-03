import { useCallback, useEffect, useRef } from "react";

function getFocusableElementsIn(rootEl) {
  if (!rootEl) return [];
  const elements = rootEl.querySelectorAll(
    [
      "a[href]",
      "button:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "[tabindex]:not([tabindex='-1'])",
    ].join(","),
  );

  return Array.from(elements).filter(
    (el) =>
      !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true",
  );
}

/**
 * useModalA11y
 * - Focuses the dialog (or a preferred element) on open
 * - Restores focus to the previously focused element on close
 * - Handles Escape to close
 * - Traps Tab focus within the dialog
 */
export function useModalA11y({
  enabled = true,
  dialogRef,
  initialFocusRef,
  onClose,
}) {
  const previouslyFocusedElementRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const handleDialogKeyDown = useCallback(
    (e) => {
      if (!enabled) return;

      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current?.();
        return;
      }

      if (e.key !== "Tab") return;

      const dialogEl = dialogRef?.current;
      const focusables = getFocusableElementsIn(dialogEl);

      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (e.shiftKey) {
        if (active === first || !dialogEl?.contains(active)) {
          e.preventDefault();
          last.focus();
        }
        return;
      }

      if (active === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [enabled, dialogRef],
  );

  useEffect(() => {
    if (!enabled) return;

    previouslyFocusedElementRef.current = document.activeElement;

    const focusInitial = () => {
      const preferred = initialFocusRef?.current;
      if (preferred?.focus) {
        preferred.focus({ preventScroll: true });
        return;
      }

      const dialogEl = dialogRef?.current;
      const focusables = getFocusableElementsIn(dialogEl);
      if (focusables[0]?.focus) {
        focusables[0].focus({ preventScroll: true });
        return;
      }

      dialogEl?.focus?.({ preventScroll: true });
    };

    const raf = requestAnimationFrame(focusInitial);

    return () => {
      cancelAnimationFrame(raf);
      const prev = previouslyFocusedElementRef.current;
      try {
        prev?.focus?.({ preventScroll: true });
      } catch {
        // ignore
      }
    };
  }, [enabled, dialogRef, initialFocusRef]);

  return { handleDialogKeyDown };
}
