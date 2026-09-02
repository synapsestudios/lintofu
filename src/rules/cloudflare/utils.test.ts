import { describe, expect, it } from 'vitest';
import { entitlesCountryBlock, readCloudflarePlan } from './utils.js';

describe('readCloudflarePlan', () => {
  it('returns the plan when settings name an accepted value', () => {
    expect(
      readCloudflarePlan({ lintofu: { cloudflare: { plan: 'pro' } } }),
    ).toEqual({ state: 'valid', plan: 'pro' });
  });

  it('is unset when settings are empty', () => {
    expect(readCloudflarePlan({})).toEqual({ state: 'unset' });
  });

  it('is unset when the lintofu namespace has no cloudflare entry', () => {
    expect(readCloudflarePlan({ lintofu: { aws: {} } })).toEqual({
      state: 'unset',
    });
  });

  it('is unset when the cloudflare entry has no plan', () => {
    expect(readCloudflarePlan({ lintofu: { cloudflare: {} } })).toEqual({
      state: 'unset',
    });
  });

  it('is unset when the lintofu namespace is not an object', () => {
    expect(readCloudflarePlan({ lintofu: 'pro' })).toEqual({ state: 'unset' });
  });

  it('is invalid when the plan is a string outside the accepted values', () => {
    expect(
      readCloudflarePlan({ lintofu: { cloudflare: { plan: 'buisness' } } }),
    ).toEqual({ state: 'invalid', value: 'buisness' });
  });

  it('is invalid when the plan is an empty string', () => {
    expect(
      readCloudflarePlan({ lintofu: { cloudflare: { plan: '' } } }),
    ).toEqual({ state: 'invalid', value: '' });
  });

  it('is invalid when the plan is not a string, reporting its text form', () => {
    expect(
      readCloudflarePlan({ lintofu: { cloudflare: { plan: 3 } } }),
    ).toEqual({ state: 'invalid', value: '3' });
  });

  it('is invalid when the plan is null', () => {
    expect(
      readCloudflarePlan({ lintofu: { cloudflare: { plan: null } } }),
    ).toEqual({ state: 'invalid', value: 'null' });
  });
});

describe('entitlesCountryBlock', () => {
  it('is true for enterprise only', () => {
    expect(entitlesCountryBlock('enterprise')).toBe(true);
    expect(entitlesCountryBlock('business')).toBe(false);
    expect(entitlesCountryBlock('pro')).toBe(false);
    expect(entitlesCountryBlock('free')).toBe(false);
  });
});
