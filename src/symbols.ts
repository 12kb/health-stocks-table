const symbols = [
    'ALLO',
    'CNST',
] as const;

export type Symbol = (typeof symbols)[number];

export default symbols;