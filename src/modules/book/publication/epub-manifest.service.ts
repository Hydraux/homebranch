import { Injectable, Logger } from '@nestjs/common';
import { basename, join, posix } from 'path';
import { Book } from 'src/modules/book/book.model';
import { EpubArchiveCacheService } from 'src/modules/book/publication/epub-archive-cache.service';

interface ManifestItem {
  id: string;
  href: string;
  mediaType: string;
  properties?: string;
}

interface SpineItem {
  idref: string;
}

interface TocEntry {
  href: string;
  title: string;
  children?: TocEntry[];
}

@Injectable()
export class EpubManifestService {
  private readonly logger = new Logger(EpubManifestService.name);

  constructor(private readonly epubArchiveCache: EpubArchiveCacheService) {}

  async generateManifest(book: Book, baseUrl: string): Promise<object> {
    const epubPath = join('books', basename(book.fileName));
    const zip = await this.epubArchiveCache.getArchive(epubPath);

    const containerXml = zip.readAsText('META-INF/container.xml');
    const opfRelPath = this.extractOpfPath(containerXml);
    const opfDir = opfRelPath.includes('/') ? opfRelPath.substring(0, opfRelPath.lastIndexOf('/') + 1) : '';
    const opfXml = zip.readAsText(opfRelPath);

    const manifestItems = this.parseManifest(opfXml);
    const spineItems = this.parseSpine(opfXml);
    const itemById = new Map(manifestItems.map((i) => [i.id, i]));

    const contentBase = `${baseUrl}/books/${book.id}/content`;
    const makeUrl = (zipPath: string) => {
      const [pathPart, fragment] = zipPath.split('#', 2);
      const encodedPath = pathPart.split('/').map(encodeURIComponent).join('/');
      return fragment ? `${contentBase}/${encodedPath}#${fragment}` : `${contentBase}/${encodedPath}`;
    };
    const resolveHref = (relHref: string) => this.resolveZipPath(opfDir, relHref);

    const readingOrder = spineItems
      .map((s) => itemById.get(s.idref))
      .filter((item): item is ManifestItem => !!item)
      .map((item) => ({
        href: makeUrl(resolveHref(item.href)),
        type: this.normalizeMediaType(item.href, item.mediaType),
      }));

    const spineSet = new Set(spineItems.map((s) => s.idref));
    const resources = manifestItems
      .filter((item) => !spineSet.has(item.id))
      .map((item) => ({
        href: makeUrl(resolveHref(item.href)),
        type: this.normalizeMediaType(item.href, item.mediaType),
        ...(item.properties?.includes('nav') && { rel: ['contents'] }),
      }));

    let toc: TocEntry[] = [];
    const navItemId = this.extractNavItemId(opfXml);
    const tocNcxId = this.extractTocNcxId(opfXml);

    if (navItemId) {
      const navItem = itemById.get(navItemId);
      if (navItem) {
        try {
          const navPath = resolveHref(navItem.href);
          const navXml = zip.readAsText(navPath);
          const navDir = navPath.includes('/') ? navPath.substring(0, navPath.lastIndexOf('/') + 1) : '';
          toc = this.parseNavToc(navXml, makeUrl, navDir);
        } catch (e) {
          this.logger.warn(`Failed to parse EPUB3 nav TOC: ${e}`);
        }
      }
    } else if (tocNcxId) {
      const ncxItem = itemById.get(tocNcxId);
      if (ncxItem) {
        try {
          const ncxPath = resolveHref(ncxItem.href);
          const ncxXml = zip.readAsText(ncxPath);
          const ncxDir = ncxPath.includes('/') ? ncxPath.substring(0, ncxPath.lastIndexOf('/') + 1) : '';
          toc = this.parseNcxToc(ncxXml, makeUrl, ncxDir);
        } catch (e) {
          this.logger.warn(`Failed to parse EPUB2 NCX TOC: ${e}`);
        }
      }
    }

    const lang = this.extractDcValue(opfXml, 'language') || 'en';
    const readingProgression = this.extractReadingProgression(opfXml);

    return {
      '@context': 'https://readium.org/webpub-manifest/context.jsonld',
      metadata: {
        '@type': 'http://schema.org/Book',
        title: book.title,
        author: { name: book.author },
        language: lang,
        readingProgression,
        ...(book.publishedYear && { published: String(book.publishedYear) }),
        ...(book.publisher && { publisher: { name: book.publisher } }),
      },
      links: [
        {
          rel: 'self',
          href: `${baseUrl}/books/${book.id}/manifest`,
          type: 'application/webpub+json',
        },
      ],
      readingOrder,
      resources,
      toc,
    };
  }

  private extractOpfPath(containerXml: string): string {
    const match = /full-path="([^"]+\.opf)"/i.exec(containerXml);
    if (!match) throw new Error('Cannot locate OPF path in META-INF/container.xml');
    return match[1];
  }

  private parseManifest(opfXml: string): ManifestItem[] {
    const items: ManifestItem[] = [];
    const section = opfXml.match(/<manifest[^>]*>([\s\S]*?)<\/manifest>/i)?.[1] ?? '';
    const re = /<item\s([^>]+?)\s*\/?>/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(section)) !== null) {
      const attrs = m[1];
      const id = /\bid="([^"]+)"/.exec(attrs)?.[1];
      const href = /\bhref="([^"]+)"/.exec(attrs)?.[1];
      const mediaType = /\bmedia-type="([^"]+)"/.exec(attrs)?.[1];
      const properties = /\bproperties="([^"]+)"/.exec(attrs)?.[1];
      if (id && href && mediaType) {
        items.push({ id, href: decodeURIComponent(href), mediaType, properties });
      }
    }
    return items;
  }

  private parseSpine(opfXml: string): SpineItem[] {
    const items: SpineItem[] = [];
    const section = opfXml.match(/<spine[^>]*>([\s\S]*?)<\/spine>/i)?.[1] ?? '';
    const re = /<itemref\s([^>]+?)\s*\/?>/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(section)) !== null) {
      const idref = /\bidref="([^"]+)"/.exec(m[1])?.[1];
      if (idref) items.push({ idref });
    }
    return items;
  }

  private extractTocNcxId(opfXml: string): string | undefined {
    const spineTag = opfXml.match(/<spine[^>]*>/i)?.[0] ?? '';
    return /\btoc="([^"]+)"/.exec(spineTag)?.[1];
  }

  private extractNavItemId(opfXml: string): string | undefined {
    const section = opfXml.match(/<manifest[^>]*>([\s\S]*?)<\/manifest>/i)?.[1] ?? '';
    const re = /<item\s([^>]+?)\s*\/?>/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(section)) !== null) {
      const attrs = m[1];
      if (/\bproperties="[^"]*\bnav\b[^"]*"/.test(attrs)) {
        return /\bid="([^"]+)"/.exec(attrs)?.[1];
      }
    }
    return undefined;
  }

  private extractDcValue(opfXml: string, element: string): string | undefined {
    return new RegExp(`<dc:${element}[^>]*>([^<]+)</dc:${element}>`, 'i').exec(opfXml)?.[1]?.trim();
  }

  private extractReadingProgression(opfXml: string): string {
    const spineTag = opfXml.match(/<spine[^>]*>/i)?.[0] ?? '';
    return /\bpage-progression-direction="rtl"/.test(spineTag) ? 'rtl' : 'ltr';
  }

  private normalizeMediaType(href: string, mediaType: string): string {
    if (mediaType === 'application/xhtml+xml' && href.toLowerCase().endsWith('.html')) {
      return 'text/html';
    }
    return mediaType;
  }

  private parseNavToc(navXml: string, makeUrl: (p: string) => string, navDir: string): TocEntry[] {
    const tocNavMatch = navXml.match(/<nav[^>]+(?:epub:type|type)="toc"[^>]*>([\s\S]*?)<\/nav>/i);
    if (!tocNavMatch) return [];
    return this.parseOlItems(tocNavMatch[1], makeUrl, navDir);
  }

  private parseOlItems(html: string, makeUrl: (p: string) => string, baseDir: string): TocEntry[] {
    const items: TocEntry[] = [];
    const olContent = html.match(/<ol[^>]*>([\s\S]*)<\/ol>/i)?.[1] ?? '';
    const liMatches = this.extractTopLevelLi(olContent);
    for (const liContent of liMatches) {
      const anchor = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i.exec(liContent);
      if (!anchor) continue;
      const rawHref = anchor[1];
      const title = anchor[2].replace(/<[^>]+>/g, '').trim();
      const resolvedHref = rawHref.startsWith('http') ? rawHref : makeUrl(this.resolveZipPath(baseDir, rawHref));
      const childOl = /<ol[^>]*>[\s\S]*?<\/ol>/i.exec(liContent)?.[0];
      items.push({
        href: resolvedHref,
        title,
        ...(childOl ? { children: this.parseOlItems(childOl, makeUrl, baseDir) } : {}),
      });
    }
    return items;
  }

  private extractTopLevelLi(html: string): string[] {
    const results: string[] = [];
    let depth = 0;
    let start = -1;
    for (let i = 0; i < html.length; i++) {
      if (html.slice(i).match(/^<li\b/i)) {
        if (depth === 0) start = i;
        depth++;
      } else if (html.slice(i).match(/^<\/li>/i)) {
        depth--;
        if (depth === 0 && start >= 0) {
          const end = i + '</li>'.length;
          results.push(html.slice(start, end));
          start = -1;
        }
      }
    }
    return results;
  }

  private parseNcxToc(ncxXml: string, makeUrl: (p: string) => string, baseDir: string): TocEntry[] {
    const navMap = ncxXml.match(/<navMap[^>]*>([\s\S]*?)<\/navMap>/i)?.[1] ?? '';
    return this.parseNavPoints(navMap, makeUrl, baseDir);
  }

  private parseNavPoints(xml: string, makeUrl: (p: string) => string, baseDir: string): TocEntry[] {
    const items: TocEntry[] = [];
    const navPoints = this.extractTopLevelBlocks(xml, 'navPoint');
    for (const block of navPoints) {
      const src = /<content[^>]+src="([^"]+)"/i.exec(block)?.[1];
      const title = /<text>([\s\S]*?)<\/text>/i.exec(block)?.[1]?.trim();
      if (!src || !title) continue;
      const childItems = this.parseNavPoints(this.extractInnerBlockContent(block, 'navPoint'), makeUrl, baseDir);
      items.push({
        href: makeUrl(this.resolveZipPath(baseDir, src)),
        title,
        ...(childItems.length ? { children: childItems } : {}),
      });
    }
    return items;
  }

  private extractTopLevelBlocks(xml: string, tagName: string): string[] {
    const results: string[] = [];
    const openTag = new RegExp(`^<${tagName}\\b`, 'i');
    const closeTag = new RegExp(`^</${tagName}>`, 'i');
    let depth = 0;
    let start = -1;
    for (let i = 0; i < xml.length; i++) {
      const slice = xml.slice(i);
      if (openTag.test(slice)) {
        if (depth === 0) start = i;
        depth++;
      } else if (closeTag.test(slice)) {
        depth--;
        if (depth === 0 && start >= 0) {
          const end = i + `</${tagName}>`.length;
          results.push(xml.slice(start, end));
          start = -1;
        }
      }
    }
    return results;
  }

  private extractInnerBlockContent(block: string, tagName: string): string {
    const openTagEnd = block.indexOf('>');
    const closeTagStart = block.lastIndexOf(`</${tagName}>`);
    if (openTagEnd === -1 || closeTagStart === -1 || closeTagStart <= openTagEnd) {
      return '';
    }
    return block.slice(openTagEnd + 1, closeTagStart);
  }

  private resolveZipPath(baseDir: string, relativePath: string): string {
    const [pathPart, fragment] = relativePath.split('#', 2);
    const normalizedPath = posix.normalize(posix.join(baseDir || '.', pathPart));
    return fragment ? `${normalizedPath}#${fragment}` : normalizedPath;
  }
}
