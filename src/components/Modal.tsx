"use client";

/**
 * Centered modal over a click-to-dismiss backdrop. Dismiss is suppressed while
 * `busy` (so an in-flight save can't be closed out from under the user), and
 * clicks inside the card don't bubble to the backdrop.
 */
export default function Modal({
  onClose,
  busy = false,
  className,
  children,
}: {
  onClose: () => void;
  busy?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="modal-backdrop" onClick={() => !busy && onClose()}>
      <div
        className={className ? `modal ${className}` : "modal"}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
