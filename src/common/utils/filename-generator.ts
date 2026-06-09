export class FileNameGenerator {
  static generate(author: string, title: string, extension: string = '.epub'): string {
    const sanitized = `${this.sanitize(author)} - ${this.sanitize(title)}${extension}`;
    return this.truncate(sanitized, 200);
  }

  static isLegacyUuidFileName(fileName: string): boolean {
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.epub$/i;
    return uuidPattern.test(fileName);
  }

  static disambiguate(baseName: string, existingNames: Set<string>): string {
    if (!existingNames.has(baseName)) return baseName;

    const extensionIndex = baseName.lastIndexOf('.');
    const ext = extensionIndex >= 0 ? baseName.slice(extensionIndex) : '';
    const nameWithoutExt = extensionIndex >= 0 ? baseName.slice(0, extensionIndex) : baseName;
    let counter = 2;
    let candidate = `${nameWithoutExt} (${counter})${ext}`;
    while (existingNames.has(candidate)) {
      counter++;
      candidate = `${nameWithoutExt} (${counter})${ext}`;
    }
    return candidate;
  }

  private static sanitize(input: string): string {
    return input
      .replace(/[/\\]/g, '-')
      .replace(/[<>:"|?*]/g, '_')
      .replace(/\.\./g, '.')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private static truncate(fileName: string, maxLength: number): string {
    if (fileName.length <= maxLength) return fileName;
    const extensionIndex = fileName.lastIndexOf('.');
    const ext = extensionIndex >= 0 ? fileName.slice(extensionIndex) : '';
    return fileName.slice(0, maxLength - ext.length) + ext;
  }
}
