export const DEFAULT_HASM_FLAGS = Object.freeze({
  bankTransfer: true,
  tap: false,
  tamara: false,
  perPiece: false,
  marketplace: true,
  privateChannel: true,
  excel: true,
  demand: true,
});

const FLAG_ALIASES = {
  bankTransfer: ['payment_bank_transfer_only', 'bank_transfer', 'bankTransfer', 'bank_transfer_enabled'],
  tap: ['tap', 'tap_payment', 'tap_enabled', 'card_payment'],
  tamara: ['tamara', 'tamara_payment', 'tamara_enabled'],
  perPiece: ['per_piece_pricing_enabled', 'per_piece', 'perPiece', 'allow_per_piece'],
  marketplace: ['marketplace', 'marketplace_enabled', 'public_marketplace'],
  privateChannel: ['private_channel_enabled', 'private', 'private_channel'],
  excel: ['excel_import_enabled', 'excel', 'excel_import'],
  demand: ['demand_module_enabled', 'demand', 'demand_enabled'],
};

function booleanValue(value, fallback) {
  if (typeof value === 'boolean') return value;
  if (value === 1 || value === '1' || String(value).toLowerCase() === 'true') return true;
  if (value === 0 || value === '0' || String(value).toLowerCase() === 'false') return false;
  return fallback;
}

export function normalizeHasmFlags(config) {
  const raw = config?.hasm_flags;
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const normalized = { ...DEFAULT_HASM_FLAGS };

  for (const [name, aliases] of Object.entries(FLAG_ALIASES)) {
    const key = aliases.find((candidate) => Object.prototype.hasOwnProperty.call(source, candidate));
    if (key) normalized[name] = booleanValue(source[key], normalized[name]);
  }

  const methods = source.active_payment_methods;
  if (Array.isArray(methods)) {
    normalized.bankTransfer = methods.includes('bank_transfer');
    normalized.tap = methods.includes('card') || methods.includes('apple_pay') || methods.includes('tap');
    normalized.tamara = methods.includes('tamara');
  }
  if (source.payment_bank_transfer_only === true || source.payment_bank_transfer_only === 'true') {
    normalized.bankTransfer = true;
    normalized.tap = false;
    normalized.tamara = false;
  }

  return { ...normalized, raw: source };
}
