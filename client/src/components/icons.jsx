import {
  ShoppingCart,
  ShoppingBasket,
  Menu,
  Settings,
  LogOut,
  Download,
  Bell,
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  Truck,
  ChefHat,
  Headset,
  Users,
  Eye,
  EyeOff,
  UploadCloud,
  Image,
  X,
  ChevronDown,
  ChevronRight,
  Search,
  Trash2,
  UtensilsCrossed,
  Inbox,
  MapPin,
  CreditCard,
  Star,
  MessageSquare,
  LayoutDashboard,
  BarChart3,
  Tag,
  Percent,
  UserCog,
  MapPinned,
  KeyRound,
  Package,
  Leaf,
  Smartphone,
  Monitor,
  Lightbulb,
  RefreshCw,
  ImagePlus,
  User,
  ReceiptText,
  Pencil,
  Plus,
  Sun,
  Moon,
} from 'lucide-react';

const DEFAULT_SIZE = 18;
const DEFAULT_STROKE_WIDTH = 2;

const withDefaults = (LucideIcon) => {
  return function WrappedIcon({ size = DEFAULT_SIZE, strokeWidth = DEFAULT_STROKE_WIDTH, ...props }) {
    return <LucideIcon size={size} strokeWidth={strokeWidth} {...props} />;
  };
};

export const CartIcon = withDefaults(ShoppingCart);
export const BasketIcon = withDefaults(ShoppingBasket);
export const MenuIcon = withDefaults(Menu);
export const SettingsIcon = withDefaults(Settings);
export const LogoutIcon = withDefaults(LogOut);
export const InstallIcon = withDefaults(Download);
export const BellIcon = withDefaults(Bell);
export const WarningIcon = withDefaults(AlertTriangle);
export const CheckIcon = withDefaults(Check);
export const CheckCircleIcon = withDefaults(CheckCircle2);
export const ClockIcon = withDefaults(Clock);
export const TruckIcon = withDefaults(Truck);
export const ChefHatIcon = withDefaults(ChefHat);
export const SupportIcon = withDefaults(Headset);
export const UsersIcon = withDefaults(Users);
export const EyeIcon = withDefaults(Eye);
export const EyeOffIcon = withDefaults(EyeOff);
export const UploadIcon = withDefaults(UploadCloud);
export const ImageIcon = withDefaults(Image);
export const CloseIcon = withDefaults(X);
export const ChevronDownIcon = withDefaults(ChevronDown);
export const ChevronRightIcon = withDefaults(ChevronRight);
export const SearchIcon = withDefaults(Search);
export const TrashIcon = withDefaults(Trash2);
export const FoodIcon = withDefaults(UtensilsCrossed);
export const InboxIcon = withDefaults(Inbox);
export const MapPinIcon = withDefaults(MapPin);
export const CardIcon = withDefaults(CreditCard);
export const StarIcon = withDefaults(Star);
export const MessageIcon = withDefaults(MessageSquare);
export const DashboardIcon = withDefaults(LayoutDashboard);
export const ChartIcon = withDefaults(BarChart3);
export const TagIcon = withDefaults(Tag);
export const PercentIcon = withDefaults(Percent);
export const TeamIcon = withDefaults(UserCog);
export const ZoneIcon = withDefaults(MapPinned);
export const KeyIcon = withDefaults(KeyRound);
export const PackageIcon = withDefaults(Package);
export const LeafIcon = withDefaults(Leaf);
export const PhoneIcon = withDefaults(Smartphone);
export const DesktopIcon = withDefaults(Monitor);
export const TipIcon = withDefaults(Lightbulb);
export const ReloadIcon = withDefaults(RefreshCw);
export const UploadImageIcon = withDefaults(ImagePlus);
export const ProfileIcon = withDefaults(User);
export const ReceiptIcon = withDefaults(ReceiptText);
export const EditIcon = withDefaults(Pencil);
export const PlusIcon = withDefaults(Plus);
export const SunIcon = withDefaults(Sun);
export const MoonIcon = withDefaults(Moon);
