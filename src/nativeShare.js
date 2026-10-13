import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';

// Convert Blob to pure base64 (without data:... prefix)
function blobToBase64Raw(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result;
      const base64 = dataUrl.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Direct Share to other Apps (WhatsApp, Telegram, Drive, Bluetooth, etc.)
 * Specifically designed for Receipts and Images.
 * Prioritizes native Android Intent / Web Share sheet.
 */
export async function directShareFile({ blob, filename, mimeType, title, text }) {
  // 1. Android / iOS Native Capacitor App
  if (Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform()) {
    try {
      const base64Data = await blobToBase64Raw(blob);
      const saved = await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.Cache
      });

      await Share.share({
        title: title || filename,
        text: text || '',
        url: saved.uri,
        files: [saved.uri],
        dialogTitle: title || 'മറ്റ് ആപ്പുകളിലേക്ക് ഷെയർ ചെയ്യുക'
      });
      return true;
    } catch (err) {
      console.warn('Capacitor native share error, trying Web Share fallback:', err);
    }
  }

  // 2. Direct Web Share API (Mobile Chrome, Safari, Android WebView)
  const file = new File([blob], filename, { type: mimeType });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: title || filename,
        text: text || ''
      });
      return true;
    } catch (err) {
      if (err.name === 'AbortError') return false; // user cancelled share sheet
    }
  }

  // 3. Fallback: Direct Download
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2500);
  return true;
}

/**
 * Save or Share for Excel and Reports
 * Uses folder picker on desktop, and native share sheet on mobile.
 */
export async function shareOrSaveFile({ blob, filename, mimeType, title, text }) {
  // 1. Android / iOS Native Capacitor App
  if (Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform()) {
    try {
      const base64Data = await blobToBase64Raw(blob);
      const saved = await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.Cache
      });

      await Share.share({
        title: title || filename,
        text: text || '',
        url: saved.uri,
        files: [saved.uri],
        dialogTitle: title || 'സേവ് / ഷെയർ ചെയ്യുക'
      });
      return true;
    } catch (err) {
      console.warn('Capacitor share encountered error, falling back:', err);
    }
  }

  // 2. Desktop File System Access API (Native "Save As" Folder Picker)
  if (window.showSaveFilePicker) {
    try {
      const ext = '.' + filename.split('.').pop();
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [{
          description: title || 'File',
          accept: { [mimeType]: [ext] }
        }]
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return true;
    } catch (err) {
      if (err.name === 'AbortError') return false; // user cancelled
    }
  }

  // 3. Web Share API with File object
  const file = new File([blob], filename, { type: mimeType });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: title || filename,
        text: text || ''
      });
      return true;
    } catch (err) {
      if (err.name === 'AbortError') return false;
    }
  }

  // 4. Fallback Anchor Download
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2500);
  return true;
}
