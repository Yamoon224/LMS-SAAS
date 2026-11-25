/**
 * Setup commun des tests d'intégration (section 13.5): nécessite une base
 * PostgreSQL et un Redis accessibles via DATABASE_URL / REDIS_URL — fournis
 * par docker-compose.yml en local et par les services GitHub Actions en CI.
 */
process.env.NODE_ENV = "test";

jest.setTimeout(60_000);
