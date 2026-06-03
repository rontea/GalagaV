
import { Quill } from 'react-quill-new';

if (typeof window !== 'undefined') {
  (window as any).Quill = Quill;
  try {
    const Parchment = Quill.import('parchment') as any;
    if (Parchment) {
      (window as any).Parchment = Parchment;
      if (!Parchment.Attributor) {
        Parchment.Attributor = {};
      }
      if (!Parchment.Attributor.Style) {
        Parchment.Attributor.Style = Parchment.StyleAttributor || class {};
      }
    }
  } catch (e: any) {
    console.error('Parchment import issue:', e.message || 'Unknown error');
  }
}

export { Quill };
