/**
 * E2E "fumée" multi-tenant, en HTTP réel contre un backend démarré (par défaut http://127.0.0.1:3801/v1)
 * et la base PostgreSQL locale. Rejouable : chaque exécution crée deux entreprises aux slugs uniques.
 *
 * Usage (depuis backend/) :
 *   PORT=3801 node dist/main.js            # dans un autre terminal
 *   node test/e2e-smoke.mjs                # ou: pnpm test:smoke
 *
 * Raccourcis de test (documentés, jamais en production) :
 *  - Le jeton d'activation d'un compte est lu dans la table `notifications` (payload.activationUrl du
 *    gabarit `user.invited`) via Prisma, au lieu d'un e-mail réel (le SMTP local n'existe pas).
 *  - Le mot de passe du Super Administrateur est lu dans prisma/seed.ts (il n'est jamais dupliqué ici).
 *  - Les hôtes de surface sont simulés via l'en-tête X-Forwarded-Host.
 * Aucun appel à un PSP réel. Aucune donnée n'est supprimée.
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const backendRoot = join(here, "..");
const { PrismaClient } = require(join(backendRoot, "node_modules", "@prisma", "client"));

const BASE = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3801/v1";
const DOMAIN = process.env.E2E_BASE_DOMAIN ?? "votredomaine.local";
const PASSWORD = "E2e-Passw0rd!x";
const run = Date.now().toString(36);
const prisma = new PrismaClient();

const seedSource = readFileSync(join(backendRoot, "prisma", "seed.ts"), "utf8");
const ADMIN_EMAIL = /email:\s*"([^"]+@[^"]+)"/.exec(seedSource)?.[1] ?? "admin@votredomaine.local";
const ADMIN_PASSWORD = /argon2\.hash\("([^"]+)"\)/.exec(seedSource)?.[1];
if (!ADMIN_PASSWORD) throw new Error("Mot de passe admin introuvable dans prisma/seed.ts");

const results = [];
function check(scenario, name, ok, detail = "") {
  results.push({ scenario, name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} [${scenario}] ${name}${ok ? "" : `  -> ${detail}`}`);
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function call(host, method, path, { body, token, retry = true } = {}) {
  const headers = { "content-type": "application/json", "x-forwarded-host": `${host}.${DOMAIN}` };
  if (token) headers.authorization = `Bearer ${token}`;
  const response = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (response.status === 429 && retry) {
    console.log("  (429 throttling: attente 62 s puis nouvel essai)");
    await sleep(62_000);
    return call(host, method, path, { body, token, retry: false });
  }
  const text = await response.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { status: response.status, body: json };
}

const hosts = {
  admin: "admin",
  business: (slug) => `${slug}-backoffice`,
  learning: (slug) => slug,
};

async function activationUrlFor(userId, expectedCount = 1) {
  for (let i = 0; i < 40; i++) {
    // Les notifications sont créées de façon asynchrone (événement -> file): on attend le nombre attendu.
    const notifications = await prisma.notification.findMany({
      where: { recipientUserId: userId, templateKey: "user.invited" },
      orderBy: { createdAt: "desc" },
    });
    if (notifications.length >= expectedCount) return notifications[0].payload.activationUrl;
    await sleep(500);
  }
  throw new Error(`Aucune notification d'activation pour ${userId}`);
}

async function activateAndLogin({ tenantId, email, host, expectedLinks = 1 }) {
  const user = await prisma.user.findFirst({ where: { tenantId, email } });
  const url = new URL(await activationUrlFor(user.id, expectedLinks));
  const token = url.searchParams.get("token");
  const activation = await call(host, "POST", "/auth/activate", { body: { token, password: PASSWORD } });
  const login = await call(host, "POST", "/auth/login", { body: { email, password: PASSWORD } });
  return { user, activationHost: url.host, activation, login, accessToken: login.body?.accessToken };
}

function decodeJwt(token) {
  return JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
}

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      await fetch(`${BASE}/auth/login`, { method: "POST" });
      return;
    } catch {
      await sleep(1000);
    }
  }
  throw new Error(`Serveur injoignable sur ${BASE}`);
}

async function main() {
  await waitForServer();
  // ---------------------------------------------------------------- 1. Plateforme
  const S1 = "1 Plateforme / tenants";
  const adminLogin = await call("admin", "POST", "/auth/login", { body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } });
  check(S1, "login Super Admin", adminLogin.status === 201, JSON.stringify(adminLogin.body));
  const admin = adminLogin.body.accessToken;

  const plan = await call("admin", "POST", "/admin/plans", {
    token: admin,
    body: {
      name: `E2E ${run}`,
      isPublic: true,
      quotas: { maxCourses: 20, maxActiveLearners: 500, maxManagers: 10, storageGb: 5, liveSessionsPerMonth: 5 },
      features: { aiTranslation: true },
    },
  });
  check(S1, "création plan (permission plans.manage)", plan.status === 201, JSON.stringify(plan.body));
  const price = await call("admin", "POST", `/admin/plans/${plan.body.id}/prices`, {
    token: admin,
    body: { period: "MONTHLY", currency: "XOF", amount: 10000, trialDays: 30 },
  });
  check(S1, "prix du plan", price.status === 201, JSON.stringify(price.body));
  const planPrice = await prisma.planPrice.findFirst({ where: { planId: plan.body.id } });

  async function createTenant(label) {
    const slug = `e2e${label}${run}`;
    const owner = { email: `owner-${label}-${run}@example.test`, firstName: "Own", lastName: label.toUpperCase() };
    const tenant = await call("admin", "POST", "/admin/tenants", {
      token: admin,
      body: { name: `E2E ${label} ${run}`, slug, country: "CI", currency: "XOF", defaultLocale: "fr", owner },
    });
    check(S1, `création tenant ${label}`, tenant.status === 201, JSON.stringify(tenant.body));
    const activate = await call("admin", "POST", `/admin/tenants/${tenant.body.id}/activate`, { token: admin });
    check(S1, `activation tenant ${label} (admin/tenants/:id/activate)`, activate.status === 201, JSON.stringify(activate.body));
    const subscription = await call("admin", "POST", `/admin/tenants/${tenant.body.id}/subscription`, {
      token: admin,
      body: { planPriceId: planPrice.id, startWithTrial: true },
    });
    check(S1, `abonnement (essai) tenant ${label}`, subscription.status === 201, JSON.stringify(subscription.body));
    const activated = await activateAndLogin({ tenantId: tenant.body.id, email: owner.email, host: hosts.business(slug) });
    check(S1, `owner ${label}: lien d'activation sur l'hôte back-office`, activated.activationHost === `${slug}-backoffice.${DOMAIN}`, activated.activationHost);
    check(S1, `owner ${label}: activation + login`, activated.activation.status === 201 && !!activated.accessToken, JSON.stringify(activated.login.body));
    return { id: tenant.body.id, slug, ownerToken: activated.accessToken, ownerId: activated.user.id };
  }
  const A = await createTenant("a");
  const B = await createTenant("b");

  // ---------------------------------------------------------------- 2. Contenu du tenant A
  const S2 = "2 Contenu A";
  const bizA = (method, path, body, token = A.ownerToken) => call(hosts.business(A.slug), method, path, { body, token });
  const bizB = (method, path, body, token = B.ownerToken) => call(hosts.business(B.slug), method, path, { body, token });

  async function buildCourse(biz, owner, title, price) {
    const course = await biz("POST", "/business/courses", {
      title, type: "CERTIFYING", progressionMode: "SEQUENTIAL", sourceLocale: "fr", price, currency: "XOF", instructorIds: [owner.ownerId],
    });
    const courseId = course.body?.id;
    const mod = await biz("POST", `/business/courses/${courseId}/modules`, { title: "Module 1" });
    const moduleId = mod.body?.id;
    const lesson = await biz("POST", `/business/modules/${moduleId}/lessons`, {
      title: "Leçon 1", resourceType: "TEXT", contentHtml: "<p>Bonjour <script>alert(1)</script><b>monde</b></p>",
      isMandatory: true, completionCriteria: { requiresOpen: true }, downloadAllowed: false,
    });
    return { course, mod, lesson, courseId, moduleId, lessonId: lesson.body?.id };
  }

  const courseA = await buildCourse(bizA, A, `Cours A ${run}`, 0);
  check(S2, "owner A crée cours/module/leçon", courseA.course.status === 201 && courseA.mod.status === 201 && courseA.lesson.status === 201,
    JSON.stringify([courseA.course.body, courseA.mod.body, courseA.lesson.body]));
  const rules = await bizA("PUT", `/business/modules/${courseA.moduleId}/quiz`, {
    passingScorePercent: 50, maxAttempts: 2, timeLimitMinutes: 10, shuffleQuestions: true, shuffleAnswers: true,
    resultsDisplay: "DETAILED", requireLiveAttendance: false,
  });
  check(S2, "configuration du quiz", rules.status === 200, JSON.stringify(rules.body));
  const questionBody = (statement) => ({
    type: "SINGLE_CHOICE", statementHtml: `<p>${statement}</p>`, explanation: `Explication ${statement}`, points: 1,
    options: [{ label: "Correct", isCorrect: true }, { label: "Wrong", isCorrect: false }],
  });
  const q1 = await bizA("POST", `/business/modules/${courseA.moduleId}/quiz/questions`, questionBody("Q1"));
  const q2 = await bizA("POST", `/business/modules/${courseA.moduleId}/quiz/questions`, questionBody("Q2"));
  check(S2, "ajout de 2 questions de quiz", q1.status === 201 && q2.status === 201, JSON.stringify([q1.body, q2.body]));
  const examRules = await bizA("PUT", `/business/courses/${courseA.courseId}/exam`, {
    passingScorePercent: 50, timeLimitMinutes: 30, allowReentry: true,
  });
  const examQ = await bizA("POST", `/business/courses/${courseA.courseId}/exam/questions`, questionBody("E1"));
  check(S2, "configuration examen + question", examRules.status === 200 && examQ.status === 201, JSON.stringify([examRules.body, examQ.body]));
  const publish = await bizA("POST", `/business/courses/${courseA.courseId}/publish`);
  check(S2, "publication du cours A", publish.status === 201, JSON.stringify(publish.body));

  const courseA2 = await buildCourse(bizA, A, `Cours A2 ${run}`, 0);
  await bizA("POST", `/business/courses/${courseA2.courseId}/publish`);
  const paid = await buildCourse(bizA, A, `Cours payant A ${run}`, 5000);
  const paidPublish = await bizA("POST", `/business/courses/${paid.courseId}/publish`);
  check(S2, "cours payant publié", paidPublish.status === 201, JSON.stringify(paidPublish.body));
  const courseB = await buildCourse(bizB, B, `Cours B ${run}`, 0);
  await bizB("POST", `/business/courses/${courseB.courseId}/publish`);

  // Inscription d'un apprenant A1 (nécessaire pour les routes d'IDOR sur les inscriptions)
  const S3 = "3 Apprenants";
  const learnA = (method, path, opts) => call(hosts.learning(A.slug), method, path, opts);
  const learnB = (method, path, opts) => call(hosts.learning(B.slug), method, path, opts);

  const apiHostRegister = await call("api", "POST", "/public/auth/register", { body: { email: `x-${run}@example.test`, firstName: "X", lastName: "Y" } });
  check(S3, "register sur l'hôte api (sans tenant) refusé", apiHostRegister.status === 404 && apiHostRegister.body?.code === "TENANT_NON_RESOLU", JSON.stringify(apiHostRegister.body));
  const backofficeRegister = await call(hosts.business(A.slug), "POST", "/public/auth/register", { body: { email: `x2-${run}@example.test`, firstName: "X", lastName: "Y" } });
  check(S3, "register sur l'hôte back-office refusé", backofficeRegister.status === 404, JSON.stringify(backofficeRegister.body));

  async function registerLearner(tenant, label) {
    const email = `learner-${label}-${run}@example.test`;
    const first = await call(hosts.learning(tenant.slug), "POST", "/public/auth/register", { body: { email, firstName: "Lea", lastName: label } });
    const second = await call(hosts.learning(tenant.slug), "POST", "/public/auth/register", { body: { email, firstName: "Lea", lastName: label } });
    check(S3, `register ${label}: réponses identiques (anti-énumération, 1er et 2e appel)`,
      first.status === 201 && second.status === 201 && JSON.stringify(first.body) === JSON.stringify(second.body), JSON.stringify([first, second]));
    // 2 liens émis (inscription + renvoi pour compte encore INVITED): seul le dernier est valide.
    const activated = await activateAndLogin({ tenantId: tenant.id, email, host: hosts.learning(tenant.slug), expectedLinks: 2 });
    check(S3, `learner ${label}: lien d'activation sur l'hôte learning`, activated.activationHost === `${tenant.slug}.${DOMAIN}`, activated.activationHost);
    check(S3, `learner ${label}: activation + login`, activated.activation.status === 201 && !!activated.accessToken, JSON.stringify(activated.login.body));
    const again = await call(hosts.learning(tenant.slug), "POST", "/public/auth/register", { body: { email, firstName: "Lea", lastName: label } });
    check(S3, `register ${label} d'un compte actif: même réponse, aucun nouveau lien`, again.status === 201 && again.body?.registered === true, JSON.stringify(again));
    return { email, userId: activated.user.id, token: activated.accessToken };
  }
  const a1 = await registerLearner(A, "a1");
  const a2 = await registerLearner(A, "a2");
  const b1 = await registerLearner(B, "b1");
  const learnerRole = decodeJwt(a1.token);
  check(S3, "JWT apprenant: rôle Apprenant + 4 permissions learner.*", learnerRole.roles?.includes("Apprenant") && learnerRole.permissions?.filter((p) => p.startsWith("learner.")).length === 4, JSON.stringify(learnerRole));

  const tenantInfo = await learnA("GET", "/public/tenant");
  check(S3, "public/tenant: {name, slug, branding}", tenantInfo.status === 200 && tenantInfo.body?.slug === A.slug && tenantInfo.body?.branding && "logoUrl" in tenantInfo.body.branding, JSON.stringify(tenantInfo.body));
  const tenantInfoApi = await call("api", "GET", "/public/tenant");
  check(S3, "public/tenant sans tenant: 404 TENANT_NON_RESOLU", tenantInfoApi.status === 404, JSON.stringify(tenantInfoApi.body));

  const catalogue = await learnA("GET", "/public/courses");
  const titles = (catalogue.body ?? []).map((c) => c.title);
  check(S3, "catalogue A: uniquement les cours publiés de A", titles.includes(`Cours A ${run}`) && !titles.some((t) => t.includes("Cours B")), JSON.stringify(titles));

  const enrollA1 = await learnA("POST", "/public/enrollments", { token: a1.token, body: { courseId: courseA.courseId, locale: "fr", isOfflinePayment: false } });
  check(S3, "inscription gratuite -> ACTIVE", enrollA1.status === 201 && enrollA1.body?.status === "ACTIVE", JSON.stringify(enrollA1.body));
  const enrollmentId = enrollA1.body?.id;
  const crossCourseEnroll = await learnA("POST", "/public/enrollments", { token: a2.token, body: { courseId: courseB.courseId, locale: "fr", isOfflinePayment: false } });
  check(S3, "inscription à un cours du tenant B depuis le tenant A: 404", crossCourseEnroll.status === 404, JSON.stringify(crossCourseEnroll.body));

  // ---------------------------------------------------------------- 2bis. Isolation owner B -> ressources de A
  const S2b = "2b Isolation owner B -> A";
  const probes = [
    ["GET", `/business/courses/${courseA.courseId}`],
    ["PUT", `/business/courses/${courseA.courseId}`, { title: "Piraté" }],
    ["POST", `/business/courses/${courseA.courseId}/publish`],
    ["GET", `/business/courses/${courseA.courseId}/modules`],
    ["POST", `/business/courses/${courseA.courseId}/modules`, { title: "Intrus" }],
    ["GET", `/business/modules/${courseA.moduleId}/lessons`],
    ["GET", `/business/modules/${courseA.moduleId}/quiz`],
    ["PUT", `/business/modules/${courseA.moduleId}/quiz`, { passingScorePercent: 0, shuffleQuestions: false, shuffleAnswers: false, resultsDisplay: "SCORE_ONLY", requireLiveAttendance: false }],
    ["POST", `/business/modules/${courseA.moduleId}/quiz/grant-attempts`, { enrollmentId, extraAttempts: 3 }],
    ["GET", `/business/courses/${courseA.courseId}/exam`],
    ["GET", `/business/enrollments?courseId=${courseA.courseId}`],
    ["GET", `/business/enrollments/${enrollmentId}`],
    ["POST", `/business/enrollments/${enrollmentId}/suspend`],
    ["POST", `/business/enrollments/${enrollmentId}/reset-progress`],
    ["GET", `/business/live-sessions/courses/${courseA.courseId}`],
    ["POST", `/business/ai-translation/courses/${courseA.courseId}/estimate`, { targetLocale: "en" }],
    ["GET", `/business/ai-translation/courses/${courseA.courseId}/jobs`],
    ["GET", `/business/certificates/00000000-0000-4000-8000-000000000000/download-url`],
    ["POST", `/business/users/${a1.userId}/suspend`],
  ];
  for (const [method, path, body] of probes) {
    const response = await bizB(method, path, body);
    check(S2b, `${method} ${path.replace(/[0-9a-f-]{36}/g, ":id")} -> 404`, response.status === 404, `${response.status} ${JSON.stringify(response.body)}`);
  }
  const courseAfter = await bizA("GET", `/business/courses/${courseA.courseId}`);
  check(S2b, "le cours A n'a pas été modifié par B", courseAfter.body?.title === `Cours A ${run}` && courseAfter.body?.status === "PUBLISHED", JSON.stringify(courseAfter.body));
  const certList = await bizB("GET", "/business/certificates");
  check(S2b, "liste de certificats de B: vide de données A", certList.status === 200 && Array.isArray(certList.body) && certList.body.length === 0, JSON.stringify(certList.body));

  // ---------------------------------------------------------------- 3 (suite). Parcours apprenant A1
  const S3b = "3b Parcours apprenant A1";
  const my = await learnA("GET", "/public/enrollments/my", { token: a1.token });
  check(S3b, "enrollments/my enrichi (titre, prix, expiration)", my.status === 200 && my.body?.[0]?.courseTitle === `Cours A ${run}` && "pricePaid" in my.body[0] && "expiresAt" in my.body[0], JSON.stringify(my.body));

  const content = await learnA("GET", `/public/enrollments/${enrollmentId}/course-content`, { token: a1.token });
  const lessonSummary = content.body?.modules?.[0]?.lessons?.[0];
  check(S3b, "course-content: modules + leçons + accessible/validated/completed", content.status === 200 && content.body.modules[0].title === "Module 1" && content.body.modules[0].accessible === true && lessonSummary?.completed === false && lessonSummary?.id === courseA.lessonId, JSON.stringify(content.body));
  check(S3b, "course-content ne contient ni contentHtml ni storageUrl", !JSON.stringify(content.body).includes("contentHtml") && !JSON.stringify(content.body).includes("storageUrl"));

  const modulesAccess = await learnA("GET", `/public/enrollments/${enrollmentId}/courses/${courseA.courseId}/modules-access`, { token: a1.token });
  check(S3b, "modules-access: titre + ordre ajoutés", modulesAccess.status === 200 && modulesAccess.body?.[0]?.title === "Module 1" && modulesAccess.body[0].order !== undefined, JSON.stringify(modulesAccess.body));

  const lesson = await learnA("GET", `/public/enrollments/${enrollmentId}/lessons/${courseA.lessonId}`, { token: a1.token });
  check(S3b, "lesson: HTML assaini (pas de <script>), pas d'URL", lesson.status === 200 && lesson.body?.contentHtml?.includes("monde") && !lesson.body.contentHtml.includes("<script") && lesson.body.resource === null, JSON.stringify(lesson.body));

  const otherLesson = await learnA("GET", `/public/enrollments/${enrollmentId}/lessons/${courseA2.lessonId}`, { token: a1.token });
  check(S3b, "lesson d'un autre cours (même tenant) -> 404", otherLesson.status === 404, JSON.stringify(otherLesson.body));
  const otherView = await learnA("POST", `/public/enrollments/${enrollmentId}/lessons/${courseA2.lessonId}/view`, { token: a1.token, body: {} });
  check(S3b, "view d'une leçon d'un autre cours -> 404 (plus de 500 FK)", otherView.status === 404, JSON.stringify(otherView.body));
  const unknownView = await learnA("POST", `/public/enrollments/${enrollmentId}/lessons/00000000-0000-4000-8000-000000000000/view`, { token: a1.token, body: {} });
  check(S3b, "view d'une leçon inconnue -> 404", unknownView.status === 404, JSON.stringify(unknownView.body));

  const examBefore = await learnA("GET", `/public/enrollments/${enrollmentId}/exam`, { token: a1.token });
  check(S3b, "exam overview avant validation: canStartNow=false / MODULES_NOT_VALIDATED", examBefore.status === 200 && examBefore.body?.canStartNow === false && examBefore.body?.blockedReason === "MODULES_NOT_VALIDATED", JSON.stringify(examBefore.body));
  check(S3b, "exam overview: pas de champ de correction", !JSON.stringify(examBefore.body).includes("isCorrect"));
  const examEarlyStart = await learnA("POST", `/public/attempts/exam/${examBefore.body?.id}/start`, { token: a1.token, body: { enrollmentId } });
  check(S3b, "start examen avant validation des modules refusé (RG-12, MODULES_NON_VALIDES)", examEarlyStart.status === 400 && examEarlyStart.body?.code === "MODULES_NON_VALIDES", JSON.stringify(examEarlyStart.body));

  const view = await learnA("POST", `/public/enrollments/${enrollmentId}/lessons/${courseA.lessonId}/view`, { token: a1.token, body: {} });
  check(S3b, "suivi de consultation de la leçon", view.status === 201, JSON.stringify(view.body));
  const contentAfter = await learnA("GET", `/public/enrollments/${enrollmentId}/course-content`, { token: a1.token });
  check(S3b, "leçon marquée terminée après consultation", contentAfter.body?.modules?.[0]?.lessons?.[0]?.completed === true, JSON.stringify(contentAfter.body));

  const quizOverview = await learnA("GET", `/public/enrollments/${enrollmentId}/modules/${courseA.moduleId}/quiz`, { token: a1.token });
  const qo = quizOverview.body;
  check(S3b, "quiz overview: règles, tentatives, canStartNow", quizOverview.status === 200 && qo.passingScorePercent === 50 && qo.maxAttempts === 2 && qo.attemptsRemaining === 2 && qo.timeLimitMinutes === 10 && qo.canStartNow === true && qo.questionCount === 2 && qo.liveAttendance?.required === false, JSON.stringify(qo));
  check(S3b, "quiz overview: aucune donnée de correction", !/isCorrect|explanation|correctOptionIds/.test(JSON.stringify(qo)));

  const start = await learnA("POST", `/public/attempts/quiz/${qo.id}/start`, { token: a1.token, body: { enrollmentId } });
  check(S3b, "start quiz renvoie attemptId", start.status === 201 && !!start.body?.attemptId, JSON.stringify(start.body));
  const attemptId = start.body?.attemptId;
  const restart = await learnA("POST", `/public/attempts/quiz/${qo.id}/start`, { token: a1.token, body: { enrollmentId } });
  check(S3b, "start quiz pendant une tentative en cours: reprise (même attemptId)", restart.body?.attemptId === attemptId, JSON.stringify(restart.body));

  const attempt = await learnA("GET", `/public/attempts/${attemptId}`, { token: a1.token });
  const text = JSON.stringify(attempt.body);
  check(S3b, "GET attempt: 2 questions, deadline serveur, sans isCorrect/explication", attempt.status === 200 && attempt.body.questions?.length === 2 && !!attempt.body.deadline && attempt.body.status === "IN_PROGRESS" && !/isCorrect|explanation|Explication/.test(text), text.slice(0, 400));
  const earlyResult = await learnA("GET", `/public/attempts/${attemptId}/result`, { token: a1.token });
  check(S3b, "result avant soumission refusé (TENTATIVE_NON_SOUMISE)", earlyResult.status === 400 && earlyResult.body?.code === "TENTATIVE_NON_SOUMISE", JSON.stringify(earlyResult.body));

  // Autre apprenant du même tenant / apprenant d'un autre tenant
  const S3c = "3c Isolation entre apprenants";
  const learnerProbes = [
    ["GET", `/public/enrollments/${enrollmentId}/course-content`],
    ["GET", `/public/enrollments/${enrollmentId}/lessons/${courseA.lessonId}`],
    ["POST", `/public/enrollments/${enrollmentId}/lessons/${courseA.lessonId}/view`, {}],
    ["GET", `/public/enrollments/${enrollmentId}/modules/${courseA.moduleId}/quiz`],
    ["GET", `/public/enrollments/${enrollmentId}/exam`],
    ["POST", `/public/enrollments/${enrollmentId}/pay`, { method: "CARD" }],
    ["GET", `/public/enrollments/${enrollmentId}/courses/${courseA.courseId}/modules-access`],
    ["GET", `/public/attempts/${attemptId}`],
    ["GET", `/public/attempts/${attemptId}/result`],
    ["POST", `/public/attempts/${attemptId}/answers`, { questionId: attempt.body.questions[0].id, selectedOptionIds: [] }],
    ["POST", `/public/attempts/${attemptId}/submit`],
    ["POST", `/public/attempts/quiz/${qo.id}/start`, { enrollmentId }],
  ];
  for (const [method, path, body] of learnerProbes) {
    const other = await learnA(method, path, { body, token: a2.token });
    check(S3c, `A2 -> ${method} ${path.replace(/[0-9a-f-]{36}/g, ":id")} = 404`, other.status === 404, `${other.status} ${JSON.stringify(other.body)}`);
    const foreignOnB = await learnB(method, path, { body, token: b1.token });
    check(S3c, `B1 (hôte B) -> ${method} ${path.replace(/[0-9a-f-]{36}/g, ":id")} = 404`, foreignOnB.status === 404, `${foreignOnB.status} ${JSON.stringify(foreignOnB.body)}`);
  }
  const tokenOnWrongHost = await learnA("GET", `/public/enrollments/${enrollmentId}/course-content`, { token: b1.token });
  check(S3c, "jeton B1 présenté sur l'hôte A -> 403 TENANT_MISMATCH", tokenOnWrongHost.status === 403 && tokenOnWrongHost.body?.code === "TENANT_MISMATCH", JSON.stringify(tokenOnWrongHost.body));
  const learnerOnBusiness = await bizA("GET", "/business/courses", undefined, a1.token);
  check(S3c, "jeton apprenant sur l'hôte back-office -> refusé (403)", learnerOnBusiness.status === 403, JSON.stringify(learnerOnBusiness.body));

  // Réponses puis soumission (une bonne, une mauvaise -> 50 %)
  const S3d = "3d Quiz: réponses, soumission, résultat";
  const pick = (question, wanted) => question.options.find((o) => o.label === wanted).id;
  const [firstQ, secondQ] = attempt.body.questions;
  const ans1 = await learnA("POST", `/public/attempts/${attemptId}/answers`, { token: a1.token, body: { questionId: firstQ.id, selectedOptionIds: [pick(firstQ, "Correct")] } });
  const ans2 = await learnA("POST", `/public/attempts/${attemptId}/answers`, { token: a1.token, body: { questionId: secondQ.id, selectedOptionIds: [pick(secondQ, "Correct")] } });
  check(S3d, "enregistrement des réponses", ans1.status === 201 && ans2.status === 201, JSON.stringify([ans1.body, ans2.body]));
  const attemptWithAnswers = await learnA("GET", `/public/attempts/${attemptId}`, { token: a1.token });
  check(S3d, "GET attempt renvoie les réponses déjà enregistrées", attemptWithAnswers.body?.answers?.length === 2, JSON.stringify(attemptWithAnswers.body?.answers));
  const submit = await learnA("POST", `/public/attempts/${attemptId}/submit`, { token: a1.token });
  check(S3d, "soumission", submit.status === 201, JSON.stringify(submit.body));
  const result = await learnA("GET", `/public/attempts/${attemptId}/result`, { token: a1.token });
  const review = result.body?.review;
  check(S3d, "résultat DETAILED: score 100, réussi, review avec bonnes réponses et explications", result.status === 200 && result.body.passed === true && result.body.scorePercent === 100 && review?.length === 2 && review.every((r) => r.isCorrect && r.correctOptionIds.length === 1 && r.explanation?.startsWith("Explication")), JSON.stringify(result.body));
  const resubmit = await learnA("POST", `/public/attempts/${attemptId}/submit`, { token: a1.token });
  check(S3d, "double soumission refusée", resubmit.status === 400 && resubmit.body?.code === "TENTATIVE_DEJA_SOUMISE", JSON.stringify(resubmit.body));
  const quizOverviewAfter = await learnA("GET", `/public/enrollments/${enrollmentId}/modules/${courseA.moduleId}/quiz`, { token: a1.token });
  check(S3d, "quiz overview après soumission: 1 tentative utilisée, 1 restante", quizOverviewAfter.body?.attemptsUsed === 1 && quizOverviewAfter.body?.attemptsRemaining === 1, JSON.stringify(quizOverviewAfter.body));

  const examAfter = await learnA("GET", `/public/enrollments/${enrollmentId}/exam`, { token: a1.token });
  check(S3d, "module validé -> examen démarrable", examAfter.status === 200 && examAfter.body?.canStartNow === true && examAfter.body?.allModulesValidated === true, JSON.stringify(examAfter.body));
  const examStart = await learnA("POST", `/public/attempts/exam/${examAfter.body.id}/start`, { token: a1.token, body: { enrollmentId } });
  const examAttempt = await learnA("GET", `/public/attempts/${examStart.body?.attemptId}`, { token: a1.token });
  const examQuestion = examAttempt.body?.questions?.[0];
  await learnA("POST", `/public/attempts/${examStart.body?.attemptId}/answers`, { token: a1.token, body: { questionId: examQuestion?.id, selectedOptionIds: [examQuestion && pick(examQuestion, "Correct")] } });
  await learnA("POST", `/public/attempts/${examStart.body?.attemptId}/submit`, { token: a1.token });
  const examResult = await learnA("GET", `/public/attempts/${examStart.body?.attemptId}/result`, { token: a1.token });
  check(S3d, "examen: score + réussite uniquement (aucune correction)", examResult.status === 200 && examResult.body.passed === true && examResult.body.review === undefined && !/correctOptionIds|explanation/.test(JSON.stringify(examResult.body)), JSON.stringify(examResult.body));

  // ---------------------------------------------------------------- 4. Parcours payant
  const S4 = "4 Cours payant";
  const methods = await learnA("GET", "/public/payments/methods", { token: a2.token });
  check(S4, "payments/methods sans fournisseur actif: liste vide", methods.status === 200 && Array.isArray(methods.body?.methods) && methods.body.methods.length === 0, JSON.stringify(methods.body));
  const paidEnroll = await learnA("POST", "/public/enrollments", { token: a2.token, body: { courseId: paid.courseId, locale: "fr", isOfflinePayment: false } });
  check(S4, "inscription cours payant -> PENDING_PAYMENT, prix figé", paidEnroll.status === 201 && paidEnroll.body?.status === "PENDING_PAYMENT" && paidEnroll.body?.pricePaid === 5000, JSON.stringify(paidEnroll.body));
  const payNoProvider = await learnA("POST", `/public/enrollments/${paidEnroll.body?.id}/pay`, { token: a2.token, body: { method: "CARD" } });
  check(S4, "pay sans fournisseur: erreur métier propre (400 MOYEN_PAIEMENT_INDISPONIBLE, pas de 500)", payNoProvider.status === 400 && payNoProvider.body?.code === "MOYEN_PAIEMENT_INDISPONIBLE", JSON.stringify(payNoProvider.body));
  const payBadMethod = await learnA("POST", `/public/enrollments/${paidEnroll.body?.id}/pay`, { token: a2.token, body: { method: "BITCOIN" } });
  check(S4, "pay avec un moyen invalide: 400 de validation", payBadMethod.status === 400, JSON.stringify(payBadMethod.body));
  const payWithAmount = await learnA("POST", `/public/enrollments/${paidEnroll.body?.id}/pay`, { token: a2.token, body: { method: "CARD", amount: 1 } });
  check(S4, "pay: un champ amount fourni par le client est rejeté (whitelist) ou ignoré, jamais utilisé", [400, 400].includes(payWithAmount.status), JSON.stringify(payWithAmount.body));
  const payFree = await learnA("POST", `/public/enrollments/${enrollmentId}/pay`, { token: a1.token, body: { method: "CARD" } });
  check(S4, "pay sur une inscription ACTIVE: INSCRIPTION_NON_PAYABLE", payFree.status === 400 && payFree.body?.code === "INSCRIPTION_NON_PAYABLE", JSON.stringify(payFree.body));
  const lessonPending = await learnA("GET", `/public/enrollments/${paidEnroll.body?.id}/lessons/${paid.lessonId}`, { token: a2.token });
  check(S4, "contenu d'une inscription non payée: 404 (accès inactif)", lessonPending.status === 404, JSON.stringify(lessonPending.body));
  const contentPending = await learnA("GET", `/public/enrollments/${paidEnroll.body?.id}/course-content`, { token: a2.token });
  check(S4, "programme d'une inscription non payée: 404", contentPending.status === 404, JSON.stringify(contentPending.body));

  // ---------------------------------------------------------------- 5. Matrice de permissions (tenant A)
  const S5 = "5 Permissions";
  const roles = await bizA("GET", "/business/users/roles");
  const roleId = (name) => roles.body?.find((r) => r.name === name)?.id;
  check(S5, "GET business/users/roles: pas de rôle Apprenant", roles.status === 200 && !roles.body.some((r) => r.name === "Apprenant"), JSON.stringify(roles.body));

  async function staff(label, roleName) {
    const email = `${label}-${run}@example.test`;
    const invite = await bizA("POST", "/business/users", { email, firstName: label, lastName: "Staff", locale: "fr", roleIds: [roleId(roleName)] });
    check(S5, `owner invite ${label}`, invite.status === 201, JSON.stringify(invite.body));
    const activated = await activateAndLogin({ tenantId: A.id, email, host: hosts.business(A.slug) });
    check(S5, `${label}: activation + login`, !!activated.accessToken, JSON.stringify(activated.login.body));
    return { token: activated.accessToken, id: activated.user.id };
  }
  const manager = await staff("gestionnaire", "Gestionnaire");
  const trainer = await staff("formateur", "Formateur / Concepteur");

  const expectations = [
    // [rôle, méthode, chemin, statut attendu]
    ["Owner", "GET", "/business/analytics/dashboard", 200, A.ownerToken],
    ["Owner", "GET", "/business/audit", 200, A.ownerToken],
    ["Owner", "GET", "/business/wallet/balance", 200, A.ownerToken],
    ["Owner", "GET", "/business/users", 200, A.ownerToken],
    ["Owner", "GET", "/business/subscription", 200, A.ownerToken],
    ["Gestionnaire", "GET", "/business/analytics/dashboard", 200, manager.token],
    ["Gestionnaire", "GET", "/business/wallet/balance", 200, manager.token],
    ["Gestionnaire", "GET", `/business/enrollments?courseId=${courseA.courseId}`, 200, manager.token],
    ["Gestionnaire", "GET", "/business/users/trainers", 200, manager.token],
    ["Gestionnaire", "GET", "/business/audit", 403, manager.token],
    ["Gestionnaire", "POST", "/business/wallet/payouts", 403, manager.token],
    ["Gestionnaire", "GET", "/business/users", 403, manager.token],
    ["Gestionnaire", "GET", "/business/subscription", 403, manager.token],
    ["Gestionnaire", "GET", "/business/courses", 200, manager.token],
    ["Formateur", "GET", "/business/courses", 200, trainer.token],
    ["Formateur", "GET", "/business/users/trainers", 200, trainer.token],
    ["Formateur", "GET", `/business/enrollments?courseId=${courseA.courseId}`, 200, trainer.token],
    ["Formateur", "GET", `/business/enrollments/${enrollmentId}`, 200, trainer.token],
    ["Formateur", "POST", `/business/enrollments/${enrollmentId}/suspend`, 403, trainer.token],
    ["Formateur", "GET", "/business/analytics/dashboard", 403, trainer.token],
    ["Formateur", "GET", "/business/audit", 403, trainer.token],
    ["Formateur", "GET", "/business/wallet/balance", 403, trainer.token],
    ["Formateur", "GET", "/business/users", 403, trainer.token],
  ];
  for (const [who, method, path, expected, token] of expectations) {
    const response = await bizA(method, path, undefined, token);
    check(S5, `${who} ${method} ${path.split("?")[0].replace(/[0-9a-f-]{36}/g, ":id")} -> ${expected}`, response.status === expected, `${response.status} ${JSON.stringify(response.body)}`);
  }

  const trainers = await bizA("GET", "/business/users/trainers", undefined, manager.token);
  check(S5, "trainers: uniquement {id, fullName} du Formateur actif", trainers.body?.length === 1 && trainers.body[0].id === trainer.id && Object.keys(trainers.body[0]).sort().join() === "fullName,id", JSON.stringify(trainers.body));
  const usersList = await bizA("GET", "/business/users");
  check(S5, "business/users: aucun apprenant dans les utilisateurs internes", usersList.status === 200 && !usersList.body.some((u) => u.id === a1.userId), JSON.stringify(usersList.body.map((u) => u.email)));

  const enrollmentsList = await bizA("GET", `/business/enrollments?courseId=${courseA.courseId}`);
  const row = enrollmentsList.body?.find((r) => r.userId === a1.userId);
  check(S5, "enrollments list enrichi: learnerName + email", row?.learnerName === "Lea a1" && row?.email === a1.email, JSON.stringify(enrollmentsList.body));

  const selfSuspend = await bizA("POST", `/business/users/${A.ownerId}/suspend`);
  check(S5, "owner ne peut pas se suspendre (ACTION_INTERDITE_SUR_SOI_OU_PROPRIETAIRE)", selfSuspend.status === 400 && selfSuspend.body?.code === "ACTION_INTERDITE_SUR_SOI_OU_PROPRIETAIRE", JSON.stringify(selfSuspend.body));
  const selfDeactivate = await bizA("POST", `/business/users/${A.ownerId}/deactivate`);
  check(S5, "owner ne peut pas se désactiver", selfDeactivate.status === 400, JSON.stringify(selfDeactivate.body));
  const suspendMgr = await bizA("POST", `/business/users/${manager.id}/suspend`);
  const reactivateMgr = await bizA("POST", `/business/users/${manager.id}/reactivate`);
  const deactivateTrainer = await bizA("POST", `/business/users/${trainer.id}/deactivate`);
  check(S5, "suspend / reactivate / deactivate d'un utilisateur interne", suspendMgr.body?.status === "SUSPENDED" && reactivateMgr.body?.status === "ACTIVE" && deactivateTrainer.body?.status === "DEACTIVATED", JSON.stringify([suspendMgr.body, reactivateMgr.body, deactivateTrainer.body]));
  const trainersAfter = await bizA("GET", "/business/users/trainers", undefined, manager.token);
  check(S5, "formateur désactivé absent de la liste des formateurs", trainersAfter.body?.length === 0, JSON.stringify(trainersAfter.body));
  const crossTenantSuspend = await bizB("POST", `/business/users/${manager.id}/reactivate`);
  check(S5, "reactivate d'un utilisateur d'un autre tenant -> 404", crossTenantSuspend.status === 404, JSON.stringify(crossTenantSuspend.body));

  const learnerInvite = await bizA("POST", "/business/users/learners", { email: `invited-${run}@example.test`, firstName: "Inv", lastName: "Learner", locale: "fr" }, manager.token);
  check(S5, "Gestionnaire invite un apprenant (learners.manage) -> compte LEARNER INVITED", learnerInvite.status === 201 && learnerInvite.body?.status === "INVITED", JSON.stringify(learnerInvite.body));
  const invitedUser = await prisma.user.findFirst({ where: { tenantId: A.id, email: `invited-${run}@example.test` }, include: { roles: { include: { role: true } } } });
  check(S5, "apprenant invité: type LEARNER + unique rôle Apprenant", invitedUser?.type === "LEARNER" && invitedUser.roles.length === 1 && invitedUser.roles[0].role.name === "Apprenant", JSON.stringify(invitedUser));
  const learnerInviteTrainer = await bizA("POST", "/business/users/learners", { email: `inv2-${run}@example.test`, firstName: "I", lastName: "L" }, trainer.token);
  check(S5, "Formateur ne peut pas inviter d'apprenant (403)", learnerInviteTrainer.status === 403 || learnerInviteTrainer.status === 401, JSON.stringify(learnerInviteTrainer.body));

  // ---------------------------------------------------------------- Synthèse
  const failed = results.filter((r) => !r.ok);
  console.log(`\n=== ${results.length - failed.length}/${results.length} vérifications OK (run ${run}) ===`);
  if (failed.length > 0) {
    console.log("Échecs :");
    for (const f of failed) console.log(` - [${f.scenario}] ${f.name}: ${f.detail}`);
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error("E2E interrompu:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
