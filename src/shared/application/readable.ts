export type Readable<T> = {
  get(): T;
  subscribe(listener: () => void): () => void;
};
