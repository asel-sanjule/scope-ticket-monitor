import { PrismaClient } from '@prisma/client';

// Single shared instance across the whole app. Every service should import
// { prisma } from here instead of creating its own `new PrismaClient()` —
// each separate instance opens its own connection pool, which adds up fast
// against Railway's connection limit as more services get added.
export const prisma = new PrismaClient();
