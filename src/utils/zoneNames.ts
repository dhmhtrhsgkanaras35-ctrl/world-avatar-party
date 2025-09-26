// Zone name generator based on coordinates
const ZONE_NAMES = [
  'Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta',
  'Iota', 'Kappa', 'Lambda', 'Mu', 'Nu', 'Xi', 'Omicron', 'Pi',
  'Rho', 'Sigma', 'Tau', 'Upsilon', 'Phi', 'Chi', 'Psi', 'Omega',
  'Apex', 'Nexus', 'Vortex', 'Pulse', 'Storm', 'Blaze', 'Frost', 'Ember',
  'Nova', 'Echo', 'Flux', 'Prism', 'Quantum', 'Stellar', 'Cosmic', 'Aurora'
];

export const getZoneName = (zoneKey: string): string => {
  if (!zoneKey) return 'Unknown';
  
  // Extract numeric parts from zone key and create a hash
  const numbers = zoneKey.match(/-?\d+/g);
  if (!numbers) return 'Unknown';
  
  // Create a simple hash from the numbers
  let hash = 0;
  const hashString = numbers.join('');
  for (let i = 0; i < hashString.length; i++) {
    const char = hashString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Use absolute value and modulo to get index
  const index = Math.abs(hash) % ZONE_NAMES.length;
  return ZONE_NAMES[index];
};

export const getZoneNameWithCoords = (zoneKey: string): string => {
  const zoneName = getZoneName(zoneKey);
  
  // Extract coordinates for subtitle
  const numbers = zoneKey.match(/-?\d+/g);
  if (!numbers || numbers.length < 2) return zoneName;
  
  // Convert zone numbers back to approximate coordinates for display
  const lat = (parseInt(numbers[0]) * 300) / 111000.0;
  const lng = (parseInt(numbers[1]) * 300) / 111000.0;
  
  return `${zoneName} (${lat.toFixed(3)}, ${lng.toFixed(3)})`;
};