import { EpubManifestService } from 'src/modules/book/publication/epub-manifest.service';

const readAsText = jest.fn();

jest.mock('adm-zip', () => {
  return jest.fn().mockImplementation(() => ({
    readAsText,
  }));
});

describe('EpubManifestService', () => {
  let service: EpubManifestService;

  beforeEach(() => {
    service = new EpubManifestService();
    readAsText.mockReset();
    process.env.UPLOADS_DIRECTORY = '/library';
  });

  afterEach(() => {
    delete process.env.UPLOADS_DIRECTORY;
  });

  test('normalizes relative TOC hrefs so they match reading order resources', () => {
    readAsText.mockImplementation((path: string) => {
      if (path === 'META-INF/container.xml') {
        return `<?xml version="1.0"?>
          <container>
            <rootfiles>
              <rootfile full-path="OPS/package.opf" />
            </rootfiles>
          </container>`;
      }

      if (path === 'OPS/package.opf') {
        return `<?xml version="1.0"?>
          <package>
            <metadata>
              <dc:title xmlns:dc="http://purl.org/dc/elements/1.1/">Book</dc:title>
            </metadata>
            <manifest>
              <item id="nav" href="nav/toc.xhtml" media-type="application/xhtml+xml" properties="nav" />
              <item id="chapter-1" href="text/chapter1.xhtml" media-type="application/xhtml+xml" />
            </manifest>
            <spine>
              <itemref idref="chapter-1" />
            </spine>
          </package>`;
      }

      if (path === 'OPS/nav/toc.xhtml') {
        return `<?xml version="1.0"?>
          <html>
            <body>
              <nav epub:type="toc">
                <ol>
                  <li><a href="../text/chapter1.xhtml#part-1">Chapter 1</a></li>
                </ol>
              </nav>
            </body>
          </html>`;
      }

      throw new Error(`Unexpected path: ${path}`);
    });

    const manifest = service.generateManifest(
      { id: 'book-1', title: 'Book', author: 'Author', fileName: 'book.epub' } as never,
      'https://reader.example.com/api',
    ) as {
      readingOrder: Array<{ href: string }>;
      toc: Array<{ href: string }>;
    };

    expect(manifest.readingOrder[0]?.href).toBe(
      'https://reader.example.com/api/books/book-1/content/OPS/text/chapter1.xhtml',
    );
    expect(manifest.toc[0]?.href).toBe(
      'https://reader.example.com/api/books/book-1/content/OPS/text/chapter1.xhtml#part-1',
    );
  });
});
