export type GalleryImageFailedStateProps = {
  message: string;
};

/** Center bar overlay when a gallery remote image cannot be loaded. */
export function GalleryImageFailedState({ message }: GalleryImageFailedStateProps) {
  return (
    <div className="absolute inset-0 bg-black/80" role="img" aria-label={message}>
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 bg-black py-3 text-center">
        <p className="text-body-sm text-white">{message}</p>
      </div>
    </div>
  );
}
