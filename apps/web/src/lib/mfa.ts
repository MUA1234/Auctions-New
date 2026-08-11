'use client';

import { createClient } from '../utils/supabase/client';

/**
 * Multi-factor authentication for privileged staff (pack doc 09 "MFA privileged
 * staff", acceptance matrix "privileged MFA"). Thin wrappers over Supabase Auth
 * TOTP so the auth engine — not the UI — owns factor state. Enrollment produces
 * an unverified factor; a correct code verifies it and lifts the session to
 * AAL2. Staff surfaces step the session up before granting privileged actions.
 */

export interface TotpEnrollment {
  factorId: string;
  /** SVG data-URI QR code — render directly in an <img>, no external library. */
  qrCode: string;
  /** Manual-entry secret for authenticator apps that can't scan. */
  secret: string;
  uri: string;
}

export interface MfaFactor {
  id: string;
  friendlyName: string | null;
  status: 'verified' | 'unverified';
}

/**
 * Authenticator Assurance Level of the current session.
 * - `current`: what the session has now (aal1 = password only, aal2 = +MFA).
 * - `next`: the highest level this user could reach — if `next` is aal2 while
 *   `current` is aal1, the user has a verified factor and must step up.
 */
export interface AalStatus {
  current: 'aal1' | 'aal2' | null;
  next: 'aal1' | 'aal2' | null;
  /** True when a verified factor exists but the session is still at aal1. */
  needsChallenge: boolean;
  /** True when the session has satisfied MFA (or no factor is required). */
  satisfied: boolean;
}

/** Begin TOTP enrollment. Returns the QR code + secret to show the user once. */
export async function enrollTotp(friendlyName = 'Authenticator app'): Promise<TotpEnrollment> {
  const { data, error } = await createClient().auth.mfa.enroll({
    factorType: 'totp',
    friendlyName,
  });
  if (error) throw error;
  return {
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
    uri: data.totp.uri,
  };
}

/** Verify a 6-digit code against a factor. Used for both enrollment and step-up. */
export async function verifyTotp(factorId: string, code: string): Promise<void> {
  const { error } = await createClient().auth.mfa.challengeAndVerify({
    factorId,
    code: code.trim(),
  });
  if (error) throw error;
}

/** Remove an enrolled factor (drops the session back to aal1 for that user). */
export async function unenrollFactor(factorId: string): Promise<void> {
  const { error } = await createClient().auth.mfa.unenroll({ factorId });
  if (error) throw error;
}

/** List this user's TOTP factors (verified and pending). */
export async function listFactors(): Promise<MfaFactor[]> {
  const { data, error } = await createClient().auth.mfa.listFactors();
  if (error) throw error;
  return (data.totp ?? []).map((f) => ({
    id: f.id,
    friendlyName: f.friendly_name ?? null,
    status: f.status as MfaFactor['status'],
  }));
}

/** Read the session's assurance level and whether a step-up is required. */
export async function getAal(): Promise<AalStatus> {
  const { data, error } = await createClient().auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) throw error;
  const current = data.currentLevel as AalStatus['current'];
  const next = data.nextLevel as AalStatus['next'];
  return {
    current,
    next,
    needsChallenge: next === 'aal2' && current === 'aal1',
    satisfied: current === 'aal2' || next !== 'aal2',
  };
}

/** The first verified factor, if any — the one to challenge for step-up. */
export async function firstVerifiedFactorId(): Promise<string | null> {
  const factors = await listFactors();
  return factors.find((f) => f.status === 'verified')?.id ?? null;
}
