// ═══════════════════════════════════════════════════════
// FILE: lib/share.ts
// Share a verse as formatted text via the native share sheet
// Phase 2 will add image card generation via canvas
// ═══════════════════════════════════════════════════════
import { Share, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';

export type ShareableVerse = {
  reference:   string;
  translation: string;
  verse_text:  string;
  note?:       string | null;
};

// ─── Share verse as formatted text ─────────────────────
export async function shareVerse(verse: ShareableVerse): Promise<void> {
  const text = buildShareText(verse);

  try {
    const result = await Share.share(
      {
        message: text,
        title:   verse.reference,
        // iOS uses `url` for AirDrop / iMessage rich previews
        ...(Platform.OS === 'ios' ? {} : {}),
      },
      {
        dialogTitle:   `Share ${verse.reference}`,
        subject:       verse.reference,
        tintColor:     '#C50022',
      }
    );

    if (result.action === Share.sharedAction) {
      console.log('[VerseKeep] Verse shared:', verse.reference);
    }
  } catch (e: any) {
    console.warn('[VerseKeep] Share failed:', e.message);
  }
}

// ─── Format verse for sharing ──────────────────────────
function buildShareText(verse: ShareableVerse): string {
  const lines: string[] = [];

  // Quote
  lines.push(`"${verse.verse_text}"`);
  lines.push('');

  // Reference
  lines.push(`— ${verse.reference} (${verse.translation})`);

  // Personal note (optional)
  if (verse.note?.trim()) {
    lines.push('');
    lines.push(`📝 ${verse.note.trim()}`);
  }

  // App attribution
  lines.push('');
  lines.push('✦ Shared via VerseKeep');

  return lines.join('\n');
}

// ─── Share quote card as WhatsApp-friendly text ─────────
export async function shareToWhatsApp(verse: ShareableVerse): Promise<void> {
  // WhatsApp renders text with bold (*text*) and italic (_text_)
  const text =
    `*${verse.reference}* (${verse.translation})\n\n` +
    `_"${verse.verse_text}"_\n\n` +
    (verse.note?.trim() ? `${verse.note.trim()}\n\n` : '') +
    `✦ _VerseKeep_`;

  await Share.share({ message: text, title: verse.reference });
}

// ─── Copy verse to clipboard ───────────────────────────
export async function copyVerse(verse: ShareableVerse): Promise<void> {
  await Clipboard.setStringAsync(buildShareText(verse));
}
