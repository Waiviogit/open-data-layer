export const MFS_NAMESPACE = {
  IMAGES: '/images',
  JSON: '/json',
} as const;

export type MfsNamespace = (typeof MFS_NAMESPACE)[keyof typeof MFS_NAMESPACE];
