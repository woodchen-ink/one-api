export const priceType = [
  { value: 'tokens', label: '按Token收费' },
  { value: 'times', label: '按次收费' }
];

export function ValueFormatter(value) {
  if (value == null) {
    return '';
  }
  if (Number(value) === 0) {
    return 'Free';
  }
  const usdPerK = Number(value) / 1000;
  const cnyPerK = usdPerK * 7;
  return `$${usdPerK.toFixed(6)} / ￥${cnyPerK.toFixed(6)}`;
}
