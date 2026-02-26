export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    const { default: clipboardy } = await import('clipboardy');
    await clipboardy.write(text);
    return true;
  } catch {
    return false;
  }
}
