import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TOKEN_TTL_MINUTES = 15;
const SESSION_TTL_DAYS = 30;

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Finds or creates a User by email, issues a fresh magic login token.
 * Returns { user, token } — token is the raw value to embed in the email link.
 */
export async function createMagicLink(email) {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await prisma.user.upsert({
    where: { email: normalizedEmail },
    update: {},
    create: { email: normalizedEmail },
  });

  const token = generateToken();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000);

  await prisma.magicLoginToken.create({
    data: { token, userId: user.id, expiresAt },
  });

  return { user, token };
}

/**
 * Validates a magic link token. Throws on invalid/expired/used tokens.
 * Marks the token as used and returns the associated user.
 */
export async function verifyMagicLinkToken(rawToken) {
  const record = await prisma.magicLoginToken.findUnique({
    where: { token: rawToken },
    include: { user: true },
  });

  if (!record) throw new Error('INVALID_TOKEN');
  if (record.usedAt) throw new Error('TOKEN_ALREADY_USED');
  if (record.expiresAt < new Date()) throw new Error('TOKEN_EXPIRED');

  await prisma.magicLoginToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  return record.user;
}

export function signSession(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: `${SESSION_TTL_DAYS}d`,
  });
}

export function verifySession(token) {
  return jwt.verify(token, process.env.JWT_SECRET); // throws if invalid/expired
}

export async function getUserById(userId) {
  return prisma.user.findUnique({ where: { id: userId } });
}
