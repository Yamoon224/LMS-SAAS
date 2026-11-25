import type { Metadata } from "next";

import { RegisterForm } from "@/features/auth/components/RegisterForm";
import { getCopy } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getCopy();
  return { title: copy.auth.registerTitle };
}

export default function RegisterPage() {
  return <RegisterForm />;
}
