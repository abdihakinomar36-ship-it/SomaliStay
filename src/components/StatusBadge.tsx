import { clsx } from "clsx";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-700",
  cancelled: "bg-slate-200 text-slate-700",
  draft: "bg-slate-200 text-slate-700",
  pending_review: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  suspended: "bg-red-100 text-red-700",
};

export default function StatusBadge({
  status,
  label,
}: {
  status: string;
  label: string;
}) {
  return (
    <span className={clsx("badge", STATUS_STYLES[status] ?? "bg-slate-200 text-slate-700")}>
      {label}
    </span>
  );
}
