"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { restoreFormState } from "@/lib/form-state";

/**
 * Restores any form values captured just before a language switch so the
 * visitor does not lose what they had typed.
 */
export default function FormStateRestorer() {
  const pathname = usePathname() ?? "/";
  useEffect(() => {
    restoreFormState(pathname);
  }, [pathname]);
  return null;
}
