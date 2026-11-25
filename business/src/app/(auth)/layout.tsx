import { Award, BookOpen, GraduationCap, Users } from "lucide-react";
import Image from "next/image";

const HIGHLIGHTS = [
  { icon: BookOpen, text: "Vos formations, modules et leçons" },
  { icon: Users, text: "Vos apprenants, équipes et inscriptions" },
  { icon: Award, text: "Certificats, ventes et reversements" },
] as const;

/**
 * Écrans de connexion (connexion, mot de passe oublié, activation…) : à gauche, 7/12 de la largeur, une image avec la
 * présentation de l'espace ; à droite, 5/12, la carte du formulaire. Sous `lg`, l'image disparaît et la carte occupe l'écran.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh lg:grid-cols-12">
      <aside className="relative hidden overflow-hidden bg-slate-900 lg:col-span-7 lg:block" aria-hidden="true">
        <Image src="/login-hero.webp" alt="" fill priority sizes="(min-width: 1024px) 58vw, 0px" className="object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-slate-950/30" />
        <div className="absolute inset-0 bg-gradient-to-br from-brand/35 via-transparent to-transparent mix-blend-multiply" />

        <div className="absolute left-10 top-10 flex items-center gap-3 text-white">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-gradient text-brand-foreground shadow-sm">
            <GraduationCap className="h-5 w-5" />
          </span>
          <span className="font-display text-base font-semibold">SaaS LMS · Entreprise</span>
        </div>

        <div className="absolute inset-x-0 bottom-0 flex max-w-2xl flex-col gap-5 p-10 text-white">
          <h2 className="font-display text-3xl font-semibold leading-tight xl:text-4xl">Formez vos équipes et vos clients en toute simplicité</h2>
          <p className="text-sm text-white/85 xl:text-base">
            Créez vos formations, suivez la progression de vos apprenants et délivrez vos certificats, depuis un seul espace.
          </p>
          <ul className="flex flex-col gap-2.5 text-sm xl:text-base">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/15 backdrop-blur-sm">
                  <Icon className="h-4 w-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <section className="relative flex items-center justify-center overflow-hidden bg-surface-muted px-4 py-10 sm:px-8 lg:col-span-5">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand/15 via-transparent to-brand/5 lg:hidden" />
        <div className="relative flex w-full justify-center">{children}</div>
      </section>
    </main>
  );
}
