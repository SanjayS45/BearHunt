// Swap this implementation for an AI-based check (Option B) without touching callers.
// Callers only depend on: moderateText(text) => Promise<{ allowed: boolean; reason?: string }>

const BLOCKLIST = [
  'fuck', 'shit', 'ass', 'asshole', 'bitch', 'cunt', 'dick', 'pussy',
  'cock', 'bastard', 'damn', 'crap', 'piss', 'nigger', 'nigga', 'faggot',
  'retard', 'whore', 'slut',
]

// Pre-compile for performance
const PATTERN = new RegExp(
  BLOCKLIST.map(w => `\\b${w}\\b`).join('|'),
  'i'
)

export async function moderateText(text: string): Promise<{ allowed: boolean; reason?: string }> {
  if (PATTERN.test(text)) {
    return { allowed: false, reason: 'Description contains inappropriate language.' }
  }
  return { allowed: true }
}
