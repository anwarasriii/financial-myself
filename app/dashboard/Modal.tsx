"use client";

import { useRef } from "react";

export function Modal({
  triggerLabel,
  title,
  children,
}: {
  triggerLabel: string;
  title: string;
  children: (close: () => void) => React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        className="btn btn-xs btn-ghost"
        onClick={() => ref.current?.showModal()}
      >
        {triggerLabel}
      </button>
      <dialog ref={ref} className="modal">
        <div className="modal-box">
          <h3 className="text-lg font-semibold mb-4">{title}</h3>
          {children(() => ref.current?.close())}
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    </>
  );
}
