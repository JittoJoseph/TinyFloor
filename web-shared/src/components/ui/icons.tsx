"use client";

import { forwardRef, type ComponentProps, type ForwardRefExoticComponent, type RefAttributes } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AccessibilityIcon,
  Alert02Icon,
  AlertCircleIcon,
  ArrowDown01Icon,
  ArrowDown02Icon,
  ArrowExpand01Icon,
  ArrowLeft01Icon,
  ArrowLeft02Icon,
  ArrowRight01Icon,
  ArrowRight02Icon,
  ArrowShrink01Icon,
  ArrowUp02Icon,
  ArrowUpRight01Icon,
  AudioWave01Icon,
  BookOpen01Icon,
  BubbleChatIcon,
  Building03Icon,
  CalendarRemove01Icon,
  Call02Icon,
  CallEnd01Icon,
  CallMissed01Icon,
  Cancel01Icon,
  Coffee01Icon,
  ComputerIcon,
  ComputerRemoveIcon,
  ComputerScreenShareIcon,
  ComputerVideoCallIcon,
  Copy01Icon,
  CreditCardIcon,
  Delete02Icon,
  DoorClosedIcon,
  DoorOpenIcon,
  Download01Icon,
  Edit02Icon,
  Eraser01Icon,
  FootprintsIcon,
  Globe02Icon,
  GridViewIcon,
  HashtagIcon,
  HeadphoneMuteIcon,
  HeadphonesIcon,
  HelpCircleIcon,
  ImageAdd01Icon,
  InformationCircleIcon,
  Key01Icon,
  LanguageSkillIcon,
  Link01Icon,
  LinkSquare02Icon,
  Loading03Icon,
  LicenseIcon,
  LockIcon,
  Logout01Icon,
  Mail01Icon,
  MapsIcon,
  Menu01Icon,
  Message01Icon,
  Mic01Icon,
  MicOff01Icon,
  MoneyReceive02Icon,
  Moon02Icon,
  MoreHorizontalIcon,
  MusicNote01Icon,
  NextIcon,
  Notification01Icon,
  PaintBoardIcon,
  PauseIcon,
  PencilEdit01Icon,
  PencilEdit02Icon,
  PlayIcon,
  PlusSignIcon,
  Presentation01Icon,
  PreviousIcon,
  RotateLeft01Icon,
  Search01Icon,
  SecurityBlockIcon,
  SecurityCheckIcon,
  ServerOffIcon,
  Settings01Icon,
  Settings02Icon,
  Shield01Icon,
  SlidersHorizontalIcon,
  SmartPhone01Icon,
  SmileIcon,
  SmilePlusIcon,
  SourceCodeIcon,
  Sun03Icon,
  Tick02Icon,
  TimerOffIcon,
  Unlink01Icon,
  UserAdd01Icon,
  UserGroupIcon,
  UserIcon,
  UserMultipleIcon,
  UserRemove01Icon,
  Video01Icon,
  VideoOffIcon,
  ViewIcon,
  ViewOffIcon,
  VolumeHighIcon,
  VolumeMute01Icon,
  WavingHand01Icon,
  Wifi01Icon,
  ZapIcon,
  PinIcon,
  PinOffIcon,
  MinusSignIcon,
} from "@hugeicons/core-free-icons";

/*
 * Every icon in the app, from one pack: Hugeicons' free stroke-rounded set.
 * Each is named for what it means here (Check, UserPlus, Meetings), so a
 * screen reads the same whichever drawing is behind it, and changing one
 * drawing changes it everywhere. Sized by the class they're given (size-4
 * and so on) or by `size`; drawn in the current text colour.
 */

export type IconProps = Omit<ComponentProps<typeof HugeiconsIcon>, "icon">;
export type AppIcon = ForwardRefExoticComponent<IconProps & RefAttributes<SVGSVGElement>>;

/** The stroke the app draws its icons with: a touch heavier than the pack's own 1.5, to sit with the type. */
export const ICON_STROKE = 1.8;

function icon(drawing: ComponentProps<typeof HugeiconsIcon>["icon"], name: string): AppIcon {
  const Drawn = forwardRef<SVGSVGElement, IconProps>(function Drawn(props, ref) {
    return <HugeiconsIcon ref={ref} icon={drawing} size={24} strokeWidth={ICON_STROKE} aria-hidden={props["aria-label"] ? undefined : true} {...props} />;
  });
  Drawn.displayName = name;
  return Drawn;
}

export const Accessibility = icon(AccessibilityIcon, "Accessibility");
export const AlertCircle = icon(AlertCircleIcon, "AlertCircle");
export const AlertTriangle = icon(Alert02Icon, "AlertTriangle");
export const ArrowDown = icon(ArrowDown02Icon, "ArrowDown");
export const ArrowLeft = icon(ArrowLeft02Icon, "ArrowLeft");
export const ArrowRight = icon(ArrowRight02Icon, "ArrowRight");
export const ArrowUp = icon(ArrowUp02Icon, "ArrowUp");
export const ArrowUpRight = icon(ArrowUpRight01Icon, "ArrowUpRight");
export const AudioLines = icon(AudioWave01Icon, "AudioLines");
export const Bell = icon(Notification01Icon, "Bell");
export const BookOpen = icon(BookOpen01Icon, "BookOpen");
export const Building2 = icon(Building03Icon, "Building2");
export const CalendarOff = icon(CalendarRemove01Icon, "CalendarOff");
export const Chats = icon(BubbleChatIcon, "Chats");
export const Check = icon(Tick02Icon, "Check");
export const ChevronDown = icon(ArrowDown01Icon, "ChevronDown");
export const ChevronLeft = icon(ArrowLeft01Icon, "ChevronLeft");
export const ChevronRight = icon(ArrowRight01Icon, "ChevronRight");
export const Coffee = icon(Coffee01Icon, "Coffee");
export const Copy = icon(Copy01Icon, "Copy");
export const CreditCard = icon(CreditCardIcon, "CreditCard");
export const DoorClosed = icon(DoorClosedIcon, "DoorClosed");
export const DoorOpen = icon(DoorOpenIcon, "DoorOpen");
export const Download = icon(Download01Icon, "Download");
export const Eraser = icon(Eraser01Icon, "Eraser");
export const ExternalLink = icon(LinkSquare02Icon, "ExternalLink");
export const Eye = icon(ViewIcon, "Eye");
export const EyeOff = icon(ViewOffIcon, "EyeOff");
export const Floor = icon(MapsIcon, "Floor");
export const Footprints = icon(FootprintsIcon, "Footprints");
export const Gear = icon(Settings01Icon, "Gear");
export const Globe = icon(Globe02Icon, "Globe");
export const Hand = icon(WavingHand01Icon, "Hand");
export const Hash = icon(HashtagIcon, "Hash");
export const HeadphoneOff = icon(HeadphoneMuteIcon, "HeadphoneOff");
export const Headphones = icon(HeadphonesIcon, "Headphones");
export const HelpCircle = icon(HelpCircleIcon, "HelpCircle");
export const ImagePlus = icon(ImageAdd01Icon, "ImagePlus");
export const Info = icon(InformationCircleIcon, "Info");
export const KeyRound = icon(Key01Icon, "KeyRound");
export const Language = icon(LanguageSkillIcon, "Language");
export const LayoutGrid = icon(GridViewIcon, "LayoutGrid");
export const Link2 = icon(Link01Icon, "Link2");
export const Loader2 = icon(Loading03Icon, "Loader2");
export const LoaderCircle = icon(Loading03Icon, "LoaderCircle");
export const License = icon(LicenseIcon, "License");
export const Lock = icon(LockIcon, "Lock");
export const LogOut = icon(Logout01Icon, "LogOut");
export const Mail = icon(Mail01Icon, "Mail");
export const MapIcon = icon(MapsIcon, "MapIcon");
export const Maximize2 = icon(ArrowExpand01Icon, "Maximize2");
export const Meetings = icon(ComputerVideoCallIcon, "Meetings");
export const Menu = icon(Menu01Icon, "Menu");
export const MessageSquare = icon(Message01Icon, "MessageSquare");
export const MessagesSquare = icon(BubbleChatIcon, "MessagesSquare");
export const Mic = icon(Mic01Icon, "Mic");
export const MicOff = icon(MicOff01Icon, "MicOff");
export const Minimize2 = icon(ArrowShrink01Icon, "Minimize2");
export const Pin = icon(PinIcon, "Pin");
export const PinOff = icon(PinOffIcon, "PinOff");
export const Minus = icon(MinusSignIcon, "Minus");
export const Monitor = icon(ComputerIcon, "Monitor");
export const MonitorUp = icon(ComputerScreenShareIcon, "MonitorUp");
export const MonitorX = icon(ComputerRemoveIcon, "MonitorX");
export const Moon = icon(Moon02Icon, "Moon");
export const MoreHorizontal = icon(MoreHorizontalIcon, "MoreHorizontal");
export const Music2 = icon(MusicNote01Icon, "Music2");
export const Office = icon(Building03Icon, "Office");
export const Palette = icon(PaintBoardIcon, "Palette");
export const Pause = icon(PauseIcon, "Pause");
export const PenLine = icon(Edit02Icon, "PenLine");
export const Pencil = icon(PencilEdit01Icon, "Pencil");
export const People = icon(UserGroupIcon, "People");
export const Phone = icon(Call02Icon, "Phone");
export const PhoneMissed = icon(CallMissed01Icon, "PhoneMissed");
export const PhoneOff = icon(CallEnd01Icon, "PhoneOff");
export const Play = icon(PlayIcon, "Play");
export const Plus = icon(PlusSignIcon, "Plus");
export const Presentation = icon(Presentation01Icon, "Presentation");
export const Radio = icon(Wifi01Icon, "Radio");
export const Refund = icon(MoneyReceive02Icon, "Refund");
export const RotateCcw = icon(RotateLeft01Icon, "RotateCcw");
export const Search = icon(Search01Icon, "Search");
export const ServerOff = icon(ServerOffIcon, "ServerOff");
export const Settings = icon(Settings01Icon, "Settings");
export const Settings2 = icon(Settings02Icon, "Settings2");
export const Shield = icon(Shield01Icon, "Shield");
export const ShieldCheck = icon(SecurityCheckIcon, "ShieldCheck");
export const ShieldOff = icon(SecurityBlockIcon, "ShieldOff");
export const SignOut = icon(Logout01Icon, "SignOut");
export const SkipBack = icon(PreviousIcon, "SkipBack");
export const SkipForward = icon(NextIcon, "SkipForward");
export const SlidersHorizontal = icon(SlidersHorizontalIcon, "SlidersHorizontal");
export const Smartphone = icon(SmartPhone01Icon, "Smartphone");
export const Smile = icon(SmileIcon, "Smile");
export const SmilePlus = icon(SmilePlusIcon, "SmilePlus");
export const SourceCode = icon(SourceCodeIcon, "SourceCode");
export const SquarePen = icon(PencilEdit02Icon, "SquarePen");
export const Sun = icon(Sun03Icon, "Sun");
export const TimerOff = icon(TimerOffIcon, "TimerOff");
export const Trash2 = icon(Delete02Icon, "Trash2");
export const Unlink = icon(Unlink01Icon, "Unlink");
export const UserMinus = icon(UserRemove01Icon, "UserMinus");
export const UserPlus = icon(UserAdd01Icon, "UserPlus");
export const UserRound = icon(UserIcon, "UserRound");
export const Users = icon(UserGroupIcon, "Users");
export const UsersRound = icon(UserMultipleIcon, "UsersRound");
export const Video = icon(Video01Icon, "Video");
export const VideoOff = icon(VideoOffIcon, "VideoOff");
export const Volume2 = icon(VolumeHighIcon, "Volume2");
export const VolumeX = icon(VolumeMute01Icon, "VolumeX");
export const X = icon(Cancel01Icon, "X");
export const Zap = icon(ZapIcon, "Zap");
