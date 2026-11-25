/**
 * Jeu de données de DÉMO (développement uniquement) : étale entreprises, apprenants, inscriptions, certificats et
 * commissions sur les 6 derniers mois pour alimenter les graphiques du tableau de bord Admin.
 * Prérequis : `pnpm db:seed`. Idempotent : ne fait rien si les entreprises « demo-* » existent déjà.
 * Usage : pnpm --filter backend exec ts-node prisma/seed-demo.ts
 */
import { PrismaClient, type SubscriptionStatus, type TenantStatus } from "@prisma/client";

const prisma = new PrismaClient();

/** Générateur pseudo-aléatoire déterministe (mêmes graphiques à chaque exécution). */
function rng(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}
const random = rng(42);
const between = (min: number, max: number) => Math.floor(min + random() * (max - min + 1));

/** Date aléatoire dans le mois situé `monthsAgo` mois avant aujourd'hui (jamais dans le futur). */
function dateInMonth(monthsAgo: number): Date {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
  const end = monthsAgo === 0 ? now : new Date(now.getFullYear(), now.getMonth() - monthsAgo + 1, 0, 23, 59, 59);
  return new Date(start.getTime() + random() * (end.getTime() - start.getTime()));
}

async function main() {
  if (await prisma.tenant.findUnique({ where: { slug: "demo-1" } })) {
    console.log("Données de démo déjà présentes.");
    return;
  }

  const plan = await prisma.plan.findFirstOrThrow();
  const price = await prisma.planPrice.findFirstOrThrow({ where: { planId: plan.id } });

  const tenantPlan: { status: TenantStatus; subscription: SubscriptionStatus | null; monthsAgo: number }[] = [
    { status: "ACTIVE", subscription: "ACTIVE", monthsAgo: 5 },
    { status: "ACTIVE", subscription: "ACTIVE", monthsAgo: 5 },
    { status: "ACTIVE", subscription: "ACTIVE", monthsAgo: 4 },
    { status: "ACTIVE", subscription: "TRIALING", monthsAgo: 3 },
    { status: "ACTIVE", subscription: "ACTIVE", monthsAgo: 3 },
    { status: "SUSPENDED", subscription: "SUSPENDED", monthsAgo: 3 },
    { status: "ACTIVE", subscription: "GRACE_PERIOD", monthsAgo: 2 },
    { status: "ACTIVE", subscription: "ACTIVE", monthsAgo: 2 },
    { status: "DRAFT", subscription: null, monthsAgo: 1 },
    { status: "ACTIVE", subscription: "TRIALING", monthsAgo: 1 },
    { status: "ACTIVE", subscription: "ACTIVE", monthsAgo: 1 },
    { status: "ACTIVE", subscription: "CANCELED", monthsAgo: 1 },
    { status: "ACTIVE", subscription: "TRIALING", monthsAgo: 0 },
    { status: "ARCHIVED", subscription: "EXPIRED", monthsAgo: 0 },
  ];

  let learnerIndex = 0;
  let sequence = 0;

  for (const [index, spec] of tenantPlan.entries()) {
    const createdAt = dateInMonth(spec.monthsAgo);
    const tenant = await prisma.tenant.create({
      data: {
        name: `Entreprise Démo ${index + 1}`,
        slug: `demo-${index + 1}`,
        status: spec.status,
        contactEmail: `contact${index + 1}@demo.local`,
        createdAt,
      },
    });
    if (spec.subscription) {
      await prisma.subscription.create({
        data: { tenantId: tenant.id, planPriceId: price.id, status: spec.subscription, startedAt: createdAt, createdAt },
      });
    }
    if (spec.status !== "ACTIVE") continue;

    const template = await prisma.certificateTemplate.create({ data: { tenantId: tenant.id, name: "Modèle démo", design: {}, isDefault: true } });
    const course = await prisma.course.create({
      data: {
        tenantId: tenant.id,
        title: `Formation ${index + 1}`,
        status: "PUBLISHED",
        price: between(10, 60) * 1000,
        createdAt,
        certificateTemplateId: template.id,
      },
    });

    // Activité mensuelle croissante, depuis la création de l'entreprise jusqu'à aujourd'hui.
    for (let monthsAgo = spec.monthsAgo; monthsAgo >= 0; monthsAgo--) {
      const learners = between(2, 4) + (spec.monthsAgo - monthsAgo);
      for (let n = 0; n < learners; n++) {
        const enrolledAt = dateInMonth(monthsAgo);
        learnerIndex += 1;
        const user = await prisma.user.create({
          data: {
            tenantId: tenant.id,
            type: "LEARNER",
            email: `apprenant${learnerIndex}@demo.local`,
            firstName: "Apprenant",
            lastName: `${learnerIndex}`,
            status: "ACTIVE",
            createdAt: enrolledAt,
          },
        });
        const completed = random() < 0.45;
        const enrollment = await prisma.enrollment.create({
          data: {
            userId: user.id,
            courseId: course.id,
            status: completed ? "COMPLETED" : "ACTIVE",
            pricePaid: course.price,
            startedAt: enrolledAt,
            completedAt: completed ? enrolledAt : null,
            createdAt: enrolledAt,
          },
        });
        if (course.price > 0) {
          await prisma.ledgerEntry.create({
            data: {
              tenantId: tenant.id,
              account: "PLATFORM",
              direction: "CREDIT",
              amount: Math.round(course.price * 0.1),
              sourceType: "COMMISSION",
              sourceId: enrollment.id,
              availableAt: enrolledAt,
              createdAt: enrolledAt,
            },
          });
        }
        if (completed) {
          sequence += 1;
          await prisma.certificate.create({
            data: {
              enrollmentId: enrollment.id,
              templateId: template.id,
              number: `DEMO-${String(sequence).padStart(5, "0")}`,
              learnerNameSnapshot: `Apprenant ${learnerIndex}`,
              courseTitleSnapshot: course.title,
              pdfUrl: "https://example.invalid/demo.pdf",
              qrVerificationUrl: "https://example.invalid/verify",
              issuedAt: enrolledAt,
            },
          });
        }
      }
    }
  }
  console.log(`Démo : ${tenantPlan.length} entreprises, ${learnerIndex} apprenants créés.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
