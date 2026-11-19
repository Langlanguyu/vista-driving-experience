// Supports Vite subpath builds and the standalone offline HTTP bundle.
export const assetUrl = (file: string) => import.meta.env.BASE_URL + 'assets/' + file;
