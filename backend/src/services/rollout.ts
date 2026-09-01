export interface TargetRule {
  id?: string;
  attribute: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'in';
  value: string;
}

export interface Variant {
  id?: string;
  key: string;
  description?: string;
  weight: number;
}

export interface FeatureFlagConfig {
  id: string;
  key: string;
  type: 'BOOLEAN' | 'MULTIVARIATE';
  enabled: boolean;
  rollout_percentage: number;
  target_rules?: TargetRule[];
  variants?: Variant[];
}

export interface EvaluationResult {
  flagKey: string;
  enabled: boolean;
  variant: string;
  reason: 'DISABLED' | 'TARGETING_MATCH' | 'ROLLOUT_INCLUDED' | 'ROLLOUT_EXCLUDED';
}

/**
 * MurmurHash3 32-bit deterministic hashing function mapping a key to a 0-99 bucket range.
 */
export function hashToBucket(key: string): number {
  let h1 = 0x12345678;
  for (let i = 0; i < key.length; i++) {
    let k1 = key.charCodeAt(i);
    k1 = Math.imul(k1, 0xcc9e2d51);
    k1 = (k1 << 15) | (k1 >>> 17);
    k1 = Math.imul(k1, 0x1b873593);
    h1 ^= k1;
    h1 = (h1 << 13) | (h1 >>> 19);
    h1 = Math.imul(h1, 5) + 0xe6546b64;
  }
  h1 ^= key.length;
  h1 ^= h1 >>> 16;
  h1 = Math.imul(h1, 0x85ebca6b);
  h1 ^= h1 >>> 13;
  h1 = Math.imul(h1, 0xc2b2ae35);
  h1 ^= h1 >>> 16;
  return Math.abs(h1) % 100;
}

/**
 * Evaluates target rules against user attributes.
 */
export function evaluateTargetRules(rules: TargetRule[], userAttributes: Record<string, any>): boolean {
  if (!rules || rules.length === 0) return false;

  // All targeting rules are evaluated. If ANY rule matches, targeting succeeds.
  for (const rule of rules) {
    const userVal = userAttributes[rule.attribute];
    if (userVal === undefined || userVal === null) continue;

    const strUserVal = String(userVal).trim();
    const strRuleVal = String(rule.value).trim();

    switch (rule.operator) {
      case 'equals':
        if (strUserVal.toLowerCase() === strRuleVal.toLowerCase()) return true;
        break;
      case 'not_equals':
        if (strUserVal.toLowerCase() !== strRuleVal.toLowerCase()) return true;
        break;
      case 'contains':
        if (strUserVal.toLowerCase().includes(strRuleVal.toLowerCase())) return true;
        break;
      case 'in': {
        let inList: string[] = [];
        try {
          const parsed = JSON.parse(rule.value);
          if (Array.isArray(parsed)) inList = parsed.map(v => String(v).trim().toLowerCase());
        } catch {
          inList = strRuleVal.split(',').map(v => v.trim().toLowerCase());
        }
        if (inList.includes(strUserVal.toLowerCase())) return true;
        break;
      }
    }
  }

  return false;
}

/**
 * Selects multivariate variant based on deterministic bucket hash and variant weights.
 */
export function selectVariant(bucket: number, variants: Variant[], defaultActiveVariant = 'treatment'): string {
  if (!variants || variants.length === 0) {
    return defaultActiveVariant;
  }

  // Normalize variant weights to 0..100 sum
  const totalWeight = variants.reduce((acc, v) => acc + Number(v.weight), 0);
  if (totalWeight <= 0) return variants[0].key;

  let cumulative = 0;
  for (const variant of variants) {
    const normalizedWeight = (Number(variant.weight) / totalWeight) * 100;
    cumulative += normalizedWeight;
    if (bucket < cumulative) {
      return variant.key;
    }
  }

  return variants[variants.length - 1].key;
}

/**
 * Main Deterministic Flag Evaluation Logic.
 */
export function evaluateFlag(
  flag: FeatureFlagConfig,
  userKey: string,
  userAttributes: Record<string, any> = {}
): EvaluationResult {
  // Step 1: Check if flag is globally disabled
  if (!flag.enabled) {
    return {
      flagKey: flag.key,
      enabled: false,
      variant: 'off',
      reason: 'DISABLED',
    };
  }

  // Step 2: Evaluate targeting rules
  if (flag.target_rules && flag.target_rules.length > 0) {
    const isTargetMatched = evaluateTargetRules(flag.target_rules, userAttributes);
    if (isTargetMatched) {
      // If flag is multivariate, pick variant, else 'treatment'
      const variantKey = flag.type === 'MULTIVARIATE' && flag.variants?.length
        ? flag.variants[0].key
        : 'treatment';
      return {
        flagKey: flag.key,
        enabled: true,
        variant: variantKey,
        reason: 'TARGETING_MATCH',
      };
    }
  }

  // Step 3: Evaluate deterministic rollout
  const hashKey = `${flag.key}:${userKey}`;
  const bucket = hashToBucket(hashKey); // 0..99

  if (bucket < flag.rollout_percentage) {
    // Included in rollout
    const variantKey = flag.type === 'MULTIVARIATE'
      ? selectVariant(bucket, flag.variants || [], 'treatment')
      : 'treatment';
    return {
      flagKey: flag.key,
      enabled: true,
      variant: variantKey,
      reason: 'ROLLOUT_INCLUDED',
    };
  } else {
    // Excluded from rollout
    return {
      flagKey: flag.key,
      enabled: false,
      variant: flag.type === 'MULTIVARIATE' ? (flag.variants?.find(v => v.key === 'control')?.key || 'control') : 'control',
      reason: 'ROLLOUT_EXCLUDED',
    };
  }
}
