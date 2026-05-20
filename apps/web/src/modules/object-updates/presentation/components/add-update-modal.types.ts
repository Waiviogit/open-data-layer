/** How the add-update modal was opened (controls chrome and type picker). */
export type AddUpdateModalMode = 'leftRail' | 'generic' | 'feedAdd';

export type AddUpdateModalBaseProps = {
  open: boolean;
  onClose: () => void;
  objectId: string;
  viewerUsername: string;
  tagCategoryNames?: readonly string[];
};

/** Opened from a left-rail block `+` — read-only “I suggest adding field” shows the update type. */
export type AddUpdateModalLeftRailProps = AddUpdateModalBaseProps & {
  mode: 'leftRail';
  candidateUpdateTypes: readonly string[];
  /** Defaults to first supported candidate for the block when omitted. */
  initialUpdateType?: string;
};

/** Updates feed “Add” — editable type picker, pre-filled from URL filters. */
export type AddUpdateModalFeedAddProps = AddUpdateModalBaseProps & {
  mode: 'feedAdd';
  candidateUpdateTypes: readonly string[];
  initialUpdateType?: string;
  initialLocale?: string;
};

/** Other entry points (e.g. global add) — layout may differ later. */
export type AddUpdateModalGenericProps = AddUpdateModalBaseProps & {
  mode: 'generic';
  updateType: string;
};

export type AddUpdateModalProps =
  | AddUpdateModalLeftRailProps
  | AddUpdateModalFeedAddProps
  | AddUpdateModalGenericProps;

export function isLeftRailModalProps(
  props: AddUpdateModalProps,
): props is AddUpdateModalLeftRailProps {
  return props.mode === 'leftRail';
}

export function isFeedAddModalProps(
  props: AddUpdateModalProps,
): props is AddUpdateModalFeedAddProps {
  return props.mode === 'feedAdd';
}

export function isTypePickerModalProps(
  props: AddUpdateModalProps,
): props is AddUpdateModalLeftRailProps | AddUpdateModalFeedAddProps {
  return props.mode === 'leftRail' || props.mode === 'feedAdd';
}
