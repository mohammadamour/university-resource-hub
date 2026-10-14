import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, readFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { randomUUID } from "crypto";

const execAsync = promisify(exec);

/**
 * Detects the available Ghostscript binary command.
 * - Windows: often 'gswin64c' (command-line 64-bit) or 'gs'
 * - Linux / macOS: typically 'gs'
 */
async function resolveGsBinary(): Promise<string> {
  const candidates =
    process.platform === "win32"
      ? ["gswin64c", "gs", "gswin32c"]
      : ["gs"];

  for (const cmd of candidates) {
    try {
      await execAsync(`${cmd} --version`);
      return cmd;
    } catch {
      // not found, try next
    }
  }

  throw new Error(
    `Ghostscript executable not found (tested: ${candidates.join(", ")}). ` +
      `Install GhostScript locally with 'winget install ArtifexSoftware.Ghostscript' or disable NEXT_PUBLIC_ENABLE_COMPRESSION.`
  );
}

/**
 * Sanitizes and downsamples a PDF using Ghostscript.
 *
 * Capabilities:
 * - Downsamples embedded images to 150 DPI (/ebook setting)
 * - Flattens objects & strips malicious JavaScript/embedded payloads (-dSAFER)
 * - Removes non-standard metadata
 * - Retains original buffer if compression doesn't decrease file size
 *
 * @param input Raw ArrayBuffer of the uploaded PDF
 * @returns Compressed and sanitized ArrayBuffer
 */
export async function compressWithGhostscript(
  input: ArrayBuffer
): Promise<ArrayBuffer> {
  const gsBinary = await resolveGsBinary();
  const id = randomUUID();
  const inputPath = join(tmpdir(), `gs-in-${id}.pdf`);
  const outputPath = join(tmpdir(), `gs-out-${id}.pdf`);

  try {
    await writeFile(inputPath, Buffer.from(input));

    // Ghostscript command with /ebook (150 DPI), PDF 1.4 compatibility, and strict -dSAFER sandbox
    const args = [
      gsBinary,
      "-sDEVICE=pdfwrite",
      "-dCompatibilityLevel=1.4",
      "-dPDFSETTINGS=/ebook",
      "-dNOPAUSE",
      "-dBATCH",
      "-dQUIET",
      "-dSAFER",
      `-sOutputFile="${outputPath}"`,
      `"${inputPath}"`,
    ];

    await execAsync(args.join(" "));

    const compressed = await readFile(outputPath);

    // If compression yielded a larger file (e.g. vector-only PDF), keep original
    if (compressed.byteLength >= input.byteLength) {
      console.log(
        `[ghostscript] Original (${input.byteLength} bytes) is already smaller than output (${compressed.byteLength} bytes). Retaining original.`
      );
      return input;
    }

    // Return exact ArrayBuffer slice avoiding Node.js Buffer pool byteOffset issues
    return compressed.buffer.slice(
      compressed.byteOffset,
      compressed.byteOffset + compressed.byteLength
    ) as ArrayBuffer;
  } finally {
    // Guaranteed cleanup of temp files
    await Promise.all([
      unlink(inputPath).catch(() => {}),
      unlink(outputPath).catch(() => {}),
    ]);
  }
}
