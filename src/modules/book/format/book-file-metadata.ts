export interface BookMetadataSeed {
  title?: string;
  author?: string;
}

export function fillBookMetadataFromFileName<T extends BookMetadataSeed>(metadata: T, fileName: string): T {
  if (metadata.title && metadata.author) return metadata;

  const extensionIndex = fileName.lastIndexOf('.');
  const nameWithoutExt = extensionIndex >= 0 ? fileName.slice(0, extensionIndex) : fileName;
  const parts = nameWithoutExt.split(' - ');

  if (!metadata.title && parts.length >= 2) {
    metadata.author = metadata.author ?? parts[0].trim();
    metadata.title = parts.slice(1).join(' - ').trim();
    return metadata;
  }

  if (!metadata.title) {
    metadata.title = nameWithoutExt.trim();
  }

  return metadata;
}
