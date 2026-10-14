/**
 * Placeholder for the Ghostscript compression module.
 * 
 * This module is only invoked when NEXT_PUBLIC_ENABLE_COMPRESSION=true.
 * For V1, compression is disabled (false by default) because Vercel serverless
 * doesn't have a Ghostscript binary available.
 * 
 * To enable locally:
 *   1. Install GhostScript: winget install ArtifexSoftware.GhostScript
 *   2. Set NEXT_PUBLIC_ENABLE_COMPRESSION=true in .env.local
 *   3. Replace this stub with the real implementation below.
 * 
 * Real implementation (when ready):
 * 
 *   import { exec } from 'child_process';
 *   import { promisify } from 'util';
 *   import { writeFile, readFile, unlink } from 'fs/promises';
 *   import { tmpdir } from 'os';
 *   import { join } from 'path';
 * 
 *   const execAsync = promisify(exec);
 * 
 *   export async function compressWithGhostscript(input: ArrayBuffer): Promise<ArrayBuffer> {
 *     const tmp = tmpdir();
 *     const inputPath = join(tmp, `gs-in-${Date.now()}.pdf`);
 *     const outputPath = join(tmp, `gs-out-${Date.now()}.pdf`);
 * 
 *     try {
 *       await writeFile(inputPath, Buffer.from(input));
 *       await execAsync([
 *         'gs',
 *         '-sDEVICE=pdfwrite',
 *         '-dCompatibilityLevel=1.4',
 *         '-dPDFSETTINGS=/ebook',  // 150 DPI, strips metadata
 *         '-dNOPAUSE',
 *         '-dBATCH',
 *         '-dQUIET',
 *         '-dSAFER',               // CRITICAL: prevents file system access from PDF
 *         `-sOutputFile=${outputPath}`,
 *         inputPath,
 *       ].join(' '));
 *       const compressed = await readFile(outputPath);
 *       return compressed.buffer;
 *     } finally {
 *       await unlink(inputPath).catch(() => {});
 *       await unlink(outputPath).catch(() => {});
 *     }
 *   }
 */

export async function compressWithGhostscript(
  input: ArrayBuffer
): Promise<ArrayBuffer> {
  // Stub: returns the original buffer unchanged.
  // Replace with real implementation (see comments above) when Ghostscript is installed.
  console.warn(
    "[ghostscript] Compression stub called — returning original buffer. Install Ghostscript and enable NEXT_PUBLIC_ENABLE_COMPRESSION=true to activate."
  );
  return input;
}
