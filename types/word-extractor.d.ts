// Déclaration minimale pour word-extractor (le paquet ne fournit pas de types).
declare module "word-extractor" {
  interface Document {
    getBody(): string;
    getFootnotes(): string;
    getHeaders(): string;
  }
  export default class WordExtractor {
    extract(source: string | Buffer): Promise<Document>;
  }
}
