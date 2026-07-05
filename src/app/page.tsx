import { redirect } from "next/navigation";
import { currentUserEmail } from "@/lib/supabase/server";
import LandingContent from "@/components/LandingContent";
import { JsonLd } from "@/components/JsonLd";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function Landing() {
  const email = await currentUserEmail();
  if (email) redirect("/map");
  return (
    <>
      <JsonLd />
      <LandingContent />
    </>
  );
}
