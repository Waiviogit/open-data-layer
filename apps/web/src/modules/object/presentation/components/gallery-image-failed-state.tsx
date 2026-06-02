export type GalleryImageFailedStateProps = {
  message: string;
};

/** Center bar overlay when a gallery remote image cannot be loaded. */
export function GalleryImageFailedState({ message }: GalleryImageFailedStateProps) {
  return (
    <div className="gallery-failed-scrim" role="img" aria-label={message}>
      <div className="gallery-failed-bar">
        <p className="gallery-failed-text">{message}</p>
      </div>
    </div>
  );
}
