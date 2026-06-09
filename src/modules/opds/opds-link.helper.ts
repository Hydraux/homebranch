export const OPDS_LINK_REL = {
  SELF: 'self',
  START: 'start',
  NEXT: 'next',
  PREVIOUS: 'previous',
  SEARCH: 'search',
  ACQUISITION: 'http://opds-spec.org/acquisition',
  IMAGE: 'http://opds-spec.org/image',
  THUMBNAIL: 'http://opds-spec.org/image/thumbnail',
  SUBSECTION: 'subsection',
};

export const OPDS_MEDIA_TYPE = {
  NAVIGATION: 'application/atom+xml;profile=opds-catalog;kind=navigation',
  ACQUISITION: 'application/atom+xml;profile=opds-catalog;kind=acquisition',
  CATALOG: 'application/atom+xml;profile=opds-catalog',
  OPDS_JSON: 'application/opds+json',
  EPUB: 'application/epub+zip',
  OPENSEARCH: 'application/opensearchdescription+xml',
  JPEG: 'image/jpeg',
};
