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
  { state: 'unset' } | { state: 'valid'; plan: CloudflarePlan };

function isCloudflarePlan(value: unknown): value is CloudflarePlan {
  return (
    typeof value === 'string' &&
    (CLOUDFLARE_PLANS as readonly string[]).includes(value)
  );
}

export function readCloudflarePlan(settings: SettingsConfig): PlanSetting {
  const plan = objectSetting(lintofuSettings(settings).cloudflare).plan;
  if (isCloudflarePlan(plan)) return { state: 'valid', plan };
  return { state: 'unset' };
}

export function entitlesCountryBlock(plan: CloudflarePlan): boolean {
  return plan === 'enterprise';
}
