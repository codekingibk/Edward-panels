
export interface ClientFingerprint {
  screenResolution: string;
  timezone: string;
  platform: string;
  colorDepth: string;
  deviceMemory?: string;
  hardwareConcurrency: string;
  cookieEnabled: boolean;
  doNotTrack: string;
  language: string;
  languages: string;
  webgl?: string;
  canvas?: string;
}

export function generateClientFingerprint(): ClientFingerprint {
  const screen = window.screen;
  const navigator = window.navigator;

  const fingerprint: ClientFingerprint = {
    screenResolution: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    platform: navigator.platform,
    colorDepth: screen.colorDepth.toString(),
    hardwareConcurrency: navigator.hardwareConcurrency?.toString() || '0',
    cookieEnabled: navigator.cookieEnabled,
    doNotTrack: navigator.doNotTrack || 'unspecified',
    language: navigator.language,
    languages: navigator.languages.join(','),
  };

  // Add device memory if available
  if ('deviceMemory' in navigator) {
    fingerprint.deviceMemory = (navigator as any).deviceMemory.toString();
  }

  // Generate WebGL fingerprint
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        fingerprint.webgl = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      }
    }
  } catch (e) {
    // WebGL not supported
  }

  // Generate Canvas fingerprint
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Device fingerprint test 🔒', 2, 2);
      fingerprint.canvas = canvas.toDataURL();
    }
  } catch (e) {
    // Canvas not supported
  }

  return fingerprint;
}
