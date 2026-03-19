export const billingRuleStrategyOptions = [
  { value: 'override', label: '覆盖价格' },
  { value: 'multiply', label: '倍率调整' }
];

export const createEmptyBillingRule = () => ({
  name: '',
  priority: 100,
  strategy: 'override',
  match: {
    prompt_tokens_gt: '',
    prompt_tokens_lte: '',
    request_tokens_gt: '',
    request_tokens_lte: ''
  },
  input: '',
  output: '',
  extra_ratios: {}
});

const parseInteger = (value) => {
  if (value === '' || value === null || value === undefined) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const parseFloatValue = (value) => {
  if (value === '' || value === null || value === undefined) {
    return undefined;
  }

  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

export const hasBillingRules = (rules) => Array.isArray(rules) && rules.length > 0;

export const summarizeBillingRule = (rule) => {
  if (!rule) {
    return '';
  }

  const parts = [];
  const match = rule.match || {};
  const appendCondition = (label, operator, value) => {
    if (value === '' || value === null || value === undefined) {
      return;
    }
    parts.push(`${label} ${operator} ${value}`);
  };

  appendCondition('Prompt', '>', match.prompt_tokens_gt);
  appendCondition('Prompt', '<=', match.prompt_tokens_lte);
  appendCondition('Request', '>', match.request_tokens_gt);
  appendCondition('Request', '<=', match.request_tokens_lte);

  return parts.join(', ');
};

export const prepareBillingRules = (rules, calculatePrice) => {
  if (!Array.isArray(rules) || rules.length === 0) {
    return [];
  }

  return rules
    .map((rule, index) => {
      const strategy = rule?.strategy || 'override';
      const match = {
        prompt_tokens_gt: parseInteger(rule?.match?.prompt_tokens_gt),
        prompt_tokens_lte: parseInteger(rule?.match?.prompt_tokens_lte),
        request_tokens_gt: parseInteger(rule?.match?.request_tokens_gt),
        request_tokens_lte: parseInteger(rule?.match?.request_tokens_lte)
      };

      const hasMatch = Object.values(match).some((value) => value !== undefined);
      const extraRatios = {};
      Object.entries(rule?.extra_ratios || {}).forEach(([key, value]) => {
        const parsed =
          strategy === 'multiply'
            ? parseFloatValue(value)
            : value === '' || value === null || value === undefined
              ? undefined
              : calculatePrice(value);
        if (parsed !== undefined) {
          extraRatios[key] = parsed;
        }
      });

      const input =
        strategy === 'multiply'
          ? parseFloatValue(rule?.input)
          : rule?.input === '' || rule?.input === null || rule?.input === undefined
            ? undefined
            : calculatePrice(rule?.input);
      const output =
        strategy === 'multiply'
          ? parseFloatValue(rule?.output)
          : rule?.output === '' || rule?.output === null || rule?.output === undefined
            ? undefined
            : calculatePrice(rule?.output);
      const hasAdjustment = input !== undefined || output !== undefined || Object.keys(extraRatios).length > 0;

      const isBlank = !rule?.name && !hasMatch && !hasAdjustment;
      if (isBlank) {
        return null;
      }

      if (!hasMatch) {
        throw new Error(`计费规则 #${index + 1} 缺少匹配条件`);
      }

      if (!hasAdjustment) {
        throw new Error(`计费规则 #${index + 1} 缺少价格或倍率配置`);
      }

      return {
        name: rule?.name?.trim?.() || `rule-${index + 1}`,
        priority: parseInteger(rule?.priority) || 100,
        strategy,
        match: Object.fromEntries(Object.entries(match).filter(([, value]) => value !== undefined)),
        ...(input !== undefined ? { input } : {}),
        ...(output !== undefined ? { output } : {}),
        ...(Object.keys(extraRatios).length > 0 ? { extra_ratios: extraRatios } : {})
      };
    })
    .filter(Boolean);
};
