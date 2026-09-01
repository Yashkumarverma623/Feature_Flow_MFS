import { describe, it, expect } from 'vitest';
import {
  evaluateFlag,
  evaluateTargetRules,
  hashToBucket,
  selectVariant,
  FeatureFlagConfig,
  TargetRule,
  Variant
} from '../../backend/src/services/rollout';

describe('Deterministic Rollout & Flag Evaluation Engine', () => {
  it('hashToBucket should be 100% deterministic', () => {
    const key = 'checkout_v2:user_9921';
    const hash1 = hashToBucket(key);
    const hash2 = hashToBucket(key);
    const hash3 = hashToBucket(key);

    expect(hash1).toBeGreaterThanOrEqual(0);
    expect(hash1).toBeLessThan(100);
    expect(hash1).toBe(hash2);
    expect(hash2).toBe(hash3);
  });

  it('hashToBucket should produce pseudo-random uniform distribution across 10,000 users', () => {
    const sampleSize = 10000;
    const rolloutTarget = 20; // 20%
    let includedCount = 0;

    for (let i = 0; i < sampleSize; i++) {
      const bucket = hashToBucket(`feature_a:user_${i}`);
      if (bucket < rolloutTarget) {
        includedCount++;
      }
    }

    const percentage = (includedCount / sampleSize) * 100;
    // Expecting 20% +/- 3% tolerance
    expect(percentage).toBeGreaterThanOrEqual(17);
    expect(percentage).toBeLessThanOrEqual(23);
  });

  it('Disabled flag must always evaluate to disabled', () => {
    const flag: FeatureFlagConfig = {
      id: '1',
      key: 'test_flag',
      type: 'BOOLEAN',
      enabled: false,
      rollout_percentage: 100,
    };

    const result = evaluateFlag(flag, 'user_1');
    expect(result.enabled).toBe(false);
    expect(result.variant).toBe('off');
    expect(result.reason).toBe('DISABLED');
  });

  it('Targeting rules should prioritize matching attributes', () => {
    const rules: TargetRule[] = [
      { attribute: 'country', operator: 'equals', value: 'IN' },
      { attribute: 'plan', operator: 'in', value: '["PRO", "ENTERPRISE"]' },
    ];

    expect(evaluateTargetRules(rules, { country: 'IN' })).toBe(true);
    expect(evaluateTargetRules(rules, { country: 'US' })).toBe(false);
    expect(evaluateTargetRules(rules, { plan: 'PRO' })).toBe(true);
    expect(evaluateTargetRules(rules, { plan: 'FREE' })).toBe(false);
  });

  it('Multivariate variant selection should respect weights', () => {
    const variants: Variant[] = [
      { key: 'control', weight: 50 },
      { key: 'treatment_a', weight: 30 },
      { key: 'treatment_b', weight: 20 },
    ];

    expect(selectVariant(10, variants)).toBe('control');
    expect(selectVariant(60, variants)).toBe('treatment_a');
    expect(selectVariant(90, variants)).toBe('treatment_b');
  });

  it('Changing rollout percentage should NOT reshuffle previously included users', () => {
    const flag20: FeatureFlagConfig = {
      id: '1',
      key: 'new_hero',
      type: 'BOOLEAN',
      enabled: true,
      rollout_percentage: 20,
    };

    const flag50: FeatureFlagConfig = {
      ...flag20,
      rollout_percentage: 50,
    };

    const includedUsersIn20: string[] = [];
    for (let i = 0; i < 500; i++) {
      const user = `user_${i}`;
      if (evaluateFlag(flag20, user).enabled) {
        includedUsersIn20.push(user);
      }
    }

    // All users included in 20% MUST remain included when rollout increases to 50%
    for (const user of includedUsersIn20) {
      expect(evaluateFlag(flag50, user).enabled).toBe(true);
    }
  });
});
