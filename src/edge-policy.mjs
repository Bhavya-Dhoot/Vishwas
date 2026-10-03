// Local-only applies to application adapters. Host firewall policy is a separate deployment control.
export function edgeOnly() {
  const value = process.env.EDGE_ONLY ?? 'false';
  if (!['true', 'false'].includes(value)) throw new Error('EDGE_ONLY must be true or false');
  return value === 'true';
}

export function enforceEdgeUrl(value) {
  if (edgeOnly() && !['127.0.0.1', '[::1]', 'localhost'].includes(new URL(value).hostname)) {
    throw new Error('EDGE_ONLY permits only loopback service endpoints');
  }
}
