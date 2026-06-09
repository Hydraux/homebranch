import { Injectable, Logger } from '@nestjs/common';
import * as AdmZip from 'adm-zip';
import { convert, create } from 'xmlbuilder2';
import { renameSync, copyFileSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { randomUUID } from 'crypto';
import { SyncableMetadata } from 'src/common/value-objects/syncable-metadata';

@Injectable()
export class EpubMetadataWriterService {
  private readonly logger = new Logger(EpubMetadataWriterService.name);

  writeMetadata(epubPath: string, metadata: SyncableMetadata): Promise<void> {
    const tempPath = join(dirname(epubPath), `.tmp-${randomUUID()}.epub`);

    try {
      copyFileSync(epubPath, tempPath);

      const zip = new AdmZip(tempPath);
      const opfPath = this.findOpfPath(zip);
      if (!opfPath) {
        throw new Error('Could not locate OPF file in EPUB');
      }

      const opfContent = zip.readAsText(opfPath);
      const updatedOpf = this.updateOpfMetadata(opfContent, metadata);
      zip.updateFile(opfPath, Buffer.from(updatedOpf, 'utf-8'));
      zip.writeZip(tempPath);

      // Validate by re-reading the OPF from the written file
      const validationZip = new AdmZip(tempPath);
      const validatedOpf = validationZip.readAsText(opfPath);
      if (!validatedOpf || validatedOpf.length === 0) {
        throw new Error('Validation failed: written EPUB has empty OPF');
      }

      renameSync(tempPath, epubPath);
    } catch (error) {
      try {
        unlinkSync(tempPath);
      } catch {
        // temp file may not exist
      }
      throw error;
    }
    return Promise.resolve();
  }

  private findOpfPath(zip: AdmZip): string | null {
    const containerEntry = zip.getEntry('META-INF/container.xml');
    if (containerEntry) {
      const containerXml = zip.readAsText(containerEntry);
      const match = containerXml.match(/full-path="([^"]+\.opf)"/i);
      if (match) return match[1];
    }

    const entries = zip.getEntries();
    const opfEntry = entries.find((e) => e.entryName.endsWith('.opf'));
    return opfEntry?.entryName ?? null;
  }

  private updateOpfMetadata(opfXml: string, metadata: SyncableMetadata): string {
    const doc = convert(opfXml, { format: 'object' }) as Record<string, unknown>;

    const pkg = this.findPackageElement(doc);
    if (!pkg) {
      this.logger.warn('Could not find <package> element in OPF');
      return opfXml;
    }

    const metadataEl = pkg['metadata'] ?? pkg['opf:metadata'];
    if (!metadataEl || typeof metadataEl !== 'object') {
      this.logger.warn('Could not find <metadata> element in OPF');
      return opfXml;
    }

    const meta = metadataEl as Record<string, unknown>;

    if (metadata.title) this.setDcElement(meta, 'dc:title', metadata.title);
    if (metadata.author) this.setDcElement(meta, 'dc:creator', metadata.author);
    if (metadata.language) this.setDcElement(meta, 'dc:language', metadata.language);
    if (metadata.publisher) this.setDcElement(meta, 'dc:publisher', metadata.publisher);
    if (metadata.isbn) this.setDcElement(meta, 'dc:identifier', metadata.isbn);
    if (metadata.summary) this.setDcElement(meta, 'dc:description', metadata.summary);
    if (metadata.publishedYear) this.setDcElement(meta, 'dc:date', String(metadata.publishedYear));

    if (metadata.genres?.length) {
      this.setDcElements(meta, 'dc:subject', metadata.genres);
    }

    const result = create(doc);
    return result.end({ prettyPrint: true });
  }

  private findPackageElement(doc: Record<string, unknown>): Record<string, unknown> | null {
    if (doc['package']) return doc['package'] as Record<string, unknown>;
    if (doc['opf:package']) return doc['opf:package'] as Record<string, unknown>;
    for (const value of Object.values(doc)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const nested = value as Record<string, unknown>;
        if (nested['package']) return nested['package'] as Record<string, unknown>;
        if (nested['opf:package']) return nested['opf:package'] as Record<string, unknown>;
      }
    }
    return null;
  }

  private setDcElement(meta: Record<string, unknown>, elementName: string, value: string): void {
    const existing = meta[elementName];
    if (existing && typeof existing === 'object' && !Array.isArray(existing)) {
      (existing as Record<string, unknown>)['#'] = value;
    } else {
      meta[elementName] = value;
    }
  }

  private setDcElements(meta: Record<string, unknown>, elementName: string, values: string[]): void {
    meta[elementName] = values;
  }
}
