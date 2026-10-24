"use client";

/**
 * Client wrappers so server components can render forms/buttons that need a
 * JavaScript confirm() before submitting (event handlers cannot be passed from
 * server components directly).
 */

export function ConfirmSubmitButton({
  children,
  className,
  confirmMessage,
}: {
  children: React.ReactNode;
  className?: string;
  confirmMessage: string;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!window.confirm(confirmMessage)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}

export function ConfirmForm({
  action,
  confirmMessage,
  children,
  className,
}: {
  action: (formData: FormData) => void | Promise<void>;
  confirmMessage: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <form
      action={action}
      className={className}
      onSubmit={(e) => {
        if (!window.confirm(confirmMessage)) e.preventDefault();
      }}
    >
      {children}
    </form>
  );
}
