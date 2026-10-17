import type { PrismaClient } from '../infrastructure/prisma.ts';
import {
  hashPassword,
  newId,
  newResetCode,
  newSessionToken,
  safeEqualHex,
  sha256,
  verifyPassword,
} from '../infrastructure/crypto.ts';
import { AppError } from './errors.ts';

const RESET_MINUTES = 15;
const RESET_MAX_ATTEMPTS = 5;

export type PublicUser = { id: string; email: string; name: string };
export type TokenPair = { accessToken: string; refreshToken: string; accessExpiresAt: string };
export type AuthResult = TokenPair & { user: PublicUser };

const publicUser = (u: { id: string; email: string; name: string }): PublicUser => ({
  id: u.id,
  email: u.email,
  name: u.name,
});

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export class AuthService {
  constructor(
    private readonly db: PrismaClient,
    private readonly sessionDays: number,
    private readonly accessMinutes: number,
    /** Where reset codes go until email delivery exists. */
    private readonly deliverResetCode: (email: string, code: string) => void,
  ) {}

  async register(input: { email: string; name: string; password: string }): Promise<AuthResult> {
    const email = normalizeEmail(input.email);
    if (await this.db.user.findUnique({ where: { email } })) {
      throw new AppError('conflict', 'EMAIL_TAKEN', 'An account with this email already exists.');
    }
    const user = await this.db.user.create({
      data: { id: newId(), email, name: input.name.trim(), passwordHash: await hashPassword(input.password) },
    });
    return { ...(await this.createSession(user.id)), user: publicUser(user) };
  }

  async login(input: { email: string; password: string }): Promise<AuthResult> {
    const user = await this.db.user.findUnique({ where: { email: normalizeEmail(input.email) } });
    // Same error whether the email or the password is wrong, so accounts can't be probed.
    if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
      throw new AppError('unauthorized', 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
    }
    return { ...(await this.createSession(user.id)), user: publicUser(user) };
  }

  async logout(accessToken: string): Promise<void> {
    await this.db.session.deleteMany({ where: { accessHash: sha256(accessToken) } });
  }

  /** Resolves an access token to its user, or null if unknown/expired. */
  async authenticate(accessToken: string): Promise<PublicUser | null> {
    const session = await this.db.session.findUnique({
      where: { accessHash: sha256(accessToken) },
      include: { user: true },
    });
    if (!session || session.accessExpiresAt < new Date()) return null;
    return publicUser(session.user);
  }

  /**
   * Swaps a refresh token for a new access + refresh pair (rotation).
   * Presenting an already-rotated refresh token means it leaked: the session is revoked.
   */
  async refresh(refreshToken: string): Promise<AuthResult> {
    const hash = sha256(refreshToken);
    const expired = new AppError('unauthorized', 'SESSION_EXPIRED', 'Your session has ended. Please log in again.');
    const session = await this.db.session.findUnique({ where: { refreshHash: hash }, include: { user: true } });
    if (!session) {
      await this.db.session.deleteMany({ where: { prevRefreshHash: hash } });
      throw expired;
    }
    if (session.expiresAt < new Date()) {
      await this.db.session.delete({ where: { id: session.id } });
      throw expired;
    }
    const pair = this.newPair();
    await this.db.session.update({
      where: { id: session.id },
      data: {
        accessHash: sha256(pair.accessToken),
        accessExpiresAt: new Date(pair.accessExpiresAt),
        refreshHash: sha256(pair.refreshToken),
        prevRefreshHash: hash,
      },
    });
    return { ...pair, user: publicUser(session.user) };
  }

  /** Always succeeds from the caller's view, so it never reveals whether an email is registered. */
  async forgotPassword(rawEmail: string): Promise<void> {
    const email = normalizeEmail(rawEmail);
    const user = await this.db.user.findUnique({ where: { email } });
    if (!user) return;
    const code = newResetCode();
    await this.db.$transaction([
      this.db.passwordReset.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } }),
      this.db.passwordReset.create({
        data: {
          id: newId(),
          userId: user.id,
          codeHash: sha256(`${user.id}:${code}`),
          expiresAt: new Date(Date.now() + RESET_MINUTES * 60_000),
        },
      }),
    ]);
    this.deliverResetCode(email, code);
  }

  async resetPassword(input: { email: string; code: string; password: string }): Promise<AuthResult> {
    const invalid = new AppError('invalid', 'INVALID_RESET_CODE', 'That code is wrong or has expired. Request a new one.');
    const user = await this.db.user.findUnique({ where: { email: normalizeEmail(input.email) } });
    if (!user) throw invalid;
    const reset = await this.db.passwordReset.findFirst({
      where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!reset || reset.attempts >= RESET_MAX_ATTEMPTS) throw invalid;
    if (!safeEqualHex(sha256(`${user.id}:${input.code}`), reset.codeHash)) {
      await this.db.passwordReset.update({ where: { id: reset.id }, data: { attempts: { increment: 1 } } });
      throw invalid;
    }
    await this.db.$transaction([
      this.db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(input.password) } }),
      this.db.passwordReset.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
      // A password reset logs out every device.
      this.db.session.deleteMany({ where: { userId: user.id } }),
    ]);
    return { ...(await this.createSession(user.id)), user: publicUser(user) };
  }

  private newPair(): TokenPair {
    return {
      accessToken: newSessionToken(),
      refreshToken: newSessionToken(),
      accessExpiresAt: new Date(Date.now() + this.accessMinutes * 60_000).toISOString(),
    };
  }

  private async createSession(userId: string): Promise<TokenPair> {
    const pair = this.newPair();
    await this.db.session.create({
      data: {
        id: newId(),
        userId,
        accessHash: sha256(pair.accessToken),
        accessExpiresAt: new Date(pair.accessExpiresAt),
        refreshHash: sha256(pair.refreshToken),
        expiresAt: new Date(Date.now() + this.sessionDays * 86_400_000),
      },
    });
    return pair;
  }
}
