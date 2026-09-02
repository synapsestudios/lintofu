import type { SettingsConfig } from '@eslint/core';
import { lintofuSettings, objectSetting } from '../core/utils.js';

export const CLOUDFLARE_PLANS = [
  'free',
  'pro',
  'business',
  'enterprise',
] as const;

export type CloudflarePlan = (typeof CLOUDFLARE_PLANS)[number];

export type PlanSetting =
  | { state: 'unset' }
  | { state: 'valid'; plan: CloudflarePlan }
  | { state: 'invalid'; value: string };

function isCloudflarePlan(value: unknown): value is CloudflarePlan {
  return (
    typeof value === 'string' &&
    (CLOUDFLARE_PLANS as readonly string[]).includes(value)
  );
}

function describeSetting(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (typeof value === 'object') return JSON.stringify(value);
  return typeof value;
}

export function readCloudflarePlan(settings: SettingsConfig): PlanSetting {
  const plan = objectSetting(lintofuSettings(settings).cloudflare).plan;
  if (plan === undefined) return { state: 'unset' };
  if (isCloudflarePlan(plan)) return { state: 'valid', plan };
  return { state: 'invalid', value: describeSetting(plan) };
}

export function entitlesCountryBlock(plan: CloudflarePlan): boolean {
  return plan === 'enterprise';
}
