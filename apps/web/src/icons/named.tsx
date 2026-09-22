import { Icon } from './icon';
import type { IconName } from './registry';
import type { IconProps } from './types';

function createNamedIcon(name: IconName) {
  return function NamedIcon(props: IconProps) {
    return <Icon name={name} {...props} />;
  };
}

export const ArrowLeftRightIcon = createNamedIcon('arrow-left-right');
export const ArrowUpDownIcon = createNamedIcon('arrow-up-down');
export const AwardIcon = createNamedIcon('award');
export const BellIcon = createNamedIcon('bell');
export const BoldIcon = createNamedIcon('bold');
export const BookIcon = createNamedIcon('book');
export const BookOpenIcon = createNamedIcon('book-open');
export const BriefcaseIcon = createNamedIcon('briefcase');
export const BuildingIcon = createNamedIcon('building');
export const BrandFacebookIcon = createNamedIcon('brand-facebook');
export const BrandXIcon = createNamedIcon('brand-x');
export const CalendarIcon = createNamedIcon('calendar');
export const CheckIcon = createNamedIcon('check');
export const CheckCircleIcon = createNamedIcon('check-circle');
export const ChefHatIcon = createNamedIcon('chef-hat');
export const CircleStarIcon = createNamedIcon('circle-star');
export const ChevronDownIcon = createNamedIcon('chevron-down');
export const ChevronLeftIcon = createNamedIcon('chevron-left');
export const ChevronRightIcon = createNamedIcon('chevron-right');
export const ClockIcon = createNamedIcon('clock');
export const CloseIcon = createNamedIcon('close');
export const CodeIcon = createNamedIcon('code');
export const CommentIcon = createNamedIcon('comment');
export const CopyIcon = createNamedIcon('copy');
export const CupSodaIcon = createNamedIcon('cup-soda');
export const DimensionsIcon = createNamedIcon('dimensions');
export const DollarIcon = createNamedIcon('dollar');
export const EmojiIcon = createNamedIcon('emoji');
export const ExternalLinkIcon = createNamedIcon('external-link');
export const EyeOffIcon = createNamedIcon('eye-off');
export const FileTextIcon = createNamedIcon('file-text');
export const FilterIcon = createNamedIcon('filter');
export const FlagIcon = createNamedIcon('flag');
export const GlobeIcon = createNamedIcon('globe');
export const HandIcon = createNamedIcon('hand');
export const HandHelpingIcon = createNamedIcon('hand-helping');
export const HashIcon = createNamedIcon('hash');
export const HbdSavingsShieldIcon = createNamedIcon('hbd-savings-shield');
export const HeartIcon = createNamedIcon('heart');
export const HiveSavingsShieldIcon = createNamedIcon('hive-savings-shield');
export const ImageIcon = createNamedIcon('image');
export const InfoIcon = createNamedIcon('info');
export const ItalicIcon = createNamedIcon('italic');
export const LandmarkIcon = createNamedIcon('landmark');
export const LayoutGridIcon = createNamedIcon('layout-grid');
export const LinkIcon = createNamedIcon('link');
export const ListIcon = createNamedIcon('list');
export const LocateIcon = createNamedIcon('locate');
export const LockIcon = createNamedIcon('lock');
export const LockOpenIcon = createNamedIcon('lock-open');
export const MailIcon = createNamedIcon('mail');
export const MapIcon = createNamedIcon('map');
export const MapPinIcon = createNamedIcon('map-pin');
export const MaximizeIcon = createNamedIcon('maximize');
export const MinimizeIcon = createNamedIcon('minimize');
export const MinusIcon = createNamedIcon('minus');
export const MoreHorizontalIcon = createNamedIcon('more-horizontal');
export const MuteIcon = createNamedIcon('mute');
export const PackageIcon = createNamedIcon('package');
export const PencilIcon = createNamedIcon('pencil');
export const PenLineIcon = createNamedIcon('pen-line');
export const PhoneIcon = createNamedIcon('phone');
export const PinIcon = createNamedIcon('pin');
export const PlayIcon = createNamedIcon('play');
export const PlusIcon = createNamedIcon('plus');
export const PuzzleIcon = createNamedIcon('puzzle');
export const QrCodeIcon = createNamedIcon('qr-code');
export const ReblogIcon = createNamedIcon('reblog');
export const ReplyIcon = createNamedIcon('reply');
export const RewardFlashlightIcon = createNamedIcon('reward-flashlight');
export const RssIcon = createNamedIcon('rss');
export const RulerDimensionLineIcon = createNamedIcon('ruler-dimension-line');
export const SearchIcon = createNamedIcon('search');
export const SendIcon = createNamedIcon('send');
export const SendHorizontalIcon = createNamedIcon('send-horizontal');
export const ShareIcon = createNamedIcon('share');
export const ShoppingBagIcon = createNamedIcon('shopping-bag');
export const ShoppingCartIcon = createNamedIcon('shopping-cart');
export const SmartphoneIcon = createNamedIcon('smartphone');
export const SparklesIcon = createNamedIcon('sparkles');
export const StarIcon = createNamedIcon('star');
export const StoreIcon = createNamedIcon('store');
export const TableIcon = createNamedIcon('table');
export const ThumbDownIcon = createNamedIcon('thumb-down');
export const ThumbUpIcon = createNamedIcon('thumb-up');
export const TrashIcon = createNamedIcon('trash');
export const TrendingUpIcon = createNamedIcon('trending-up');
export const UserIcon = createNamedIcon('user');
export const UserMinusIcon = createNamedIcon('user-minus');
export const UserPlusIcon = createNamedIcon('user-plus');
export const UsersIcon = createNamedIcon('users');
export const UtensilsIcon = createNamedIcon('utensils');
export const UtensilsCrossedIcon = createNamedIcon('utensils-crossed');
export const VideoIcon = createNamedIcon('video');
export const WalletIcon = createNamedIcon('wallet');
export const WalletPowerLightningIcon = createNamedIcon('wallet-power-lightning');
export const WalletSavingsShieldIcon = createNamedIcon('wallet-savings-shield');
export const WeightIcon = createNamedIcon('weight');
export const WeightScaleIcon = createNamedIcon('weight-scale');
export const ZapIcon = createNamedIcon('zap');

/** Maps {@link IconName} to its named component export. */
export const NAMED_ICON_BY_NAME = {
  'arrow-left-right': ArrowLeftRightIcon,
  'arrow-up-down': ArrowUpDownIcon,
  award: AwardIcon,
  bell: BellIcon,
  bold: BoldIcon,
  book: BookIcon,
  'book-open': BookOpenIcon,
  briefcase: BriefcaseIcon,
  building: BuildingIcon,
  'brand-facebook': BrandFacebookIcon,
  'brand-x': BrandXIcon,
  calendar: CalendarIcon,
  check: CheckIcon,
  'check-circle': CheckCircleIcon,
  'chef-hat': ChefHatIcon,
  'circle-star': CircleStarIcon,
  'chevron-down': ChevronDownIcon,
  'chevron-left': ChevronLeftIcon,
  'chevron-right': ChevronRightIcon,
  clock: ClockIcon,
  close: CloseIcon,
  code: CodeIcon,
  comment: CommentIcon,
  copy: CopyIcon,
  'cup-soda': CupSodaIcon,
  dimensions: DimensionsIcon,
  dollar: DollarIcon,
  emoji: EmojiIcon,
  'external-link': ExternalLinkIcon,
  'eye-off': EyeOffIcon,
  'file-text': FileTextIcon,
  filter: FilterIcon,
  flag: FlagIcon,
  globe: GlobeIcon,
  hand: HandIcon,
  'hand-helping': HandHelpingIcon,
  hash: HashIcon,
  'hbd-savings-shield': HbdSavingsShieldIcon,
  heart: HeartIcon,
  'hive-savings-shield': HiveSavingsShieldIcon,
  image: ImageIcon,
  info: InfoIcon,
  italic: ItalicIcon,
  landmark: LandmarkIcon,
  'layout-grid': LayoutGridIcon,
  link: LinkIcon,
  list: ListIcon,
  locate: LocateIcon,
  lock: LockIcon,
  'lock-open': LockOpenIcon,
  mail: MailIcon,
  map: MapIcon,
  'map-pin': MapPinIcon,
  maximize: MaximizeIcon,
  minimize: MinimizeIcon,
  minus: MinusIcon,
  'more-horizontal': MoreHorizontalIcon,
  mute: MuteIcon,
  package: PackageIcon,
  pencil: PencilIcon,
  'pen-line': PenLineIcon,
  phone: PhoneIcon,
  pin: PinIcon,
  play: PlayIcon,
  plus: PlusIcon,
  puzzle: PuzzleIcon,
  'qr-code': QrCodeIcon,
  reblog: ReblogIcon,
  reply: ReplyIcon,
  'reward-flashlight': RewardFlashlightIcon,
  rss: RssIcon,
  'ruler-dimension-line': RulerDimensionLineIcon,
  search: SearchIcon,
  send: SendIcon,
  'send-horizontal': SendHorizontalIcon,
  share: ShareIcon,
  'shopping-bag': ShoppingBagIcon,
  'shopping-cart': ShoppingCartIcon,
  smartphone: SmartphoneIcon,
  sparkles: SparklesIcon,
  star: StarIcon,
  store: StoreIcon,
  table: TableIcon,
  'thumb-down': ThumbDownIcon,
  'thumb-up': ThumbUpIcon,
  trash: TrashIcon,
  'trending-up': TrendingUpIcon,
  user: UserIcon,
  'user-minus': UserMinusIcon,
  'user-plus': UserPlusIcon,
  users: UsersIcon,
  utensils: UtensilsIcon,
  'utensils-crossed': UtensilsCrossedIcon,
  video: VideoIcon,
  wallet: WalletIcon,
  'wallet-power-lightning': WalletPowerLightningIcon,
  'wallet-savings-shield': WalletSavingsShieldIcon,
  weight: WeightIcon,
  'weight-scale': WeightScaleIcon,
  zap: ZapIcon,
} as const satisfies Record<IconName, (props: IconProps) => ReturnType<typeof Icon>>;
