import {
  Building2, CalendarDays, Camera, ClipboardList, Crown, DollarSign, Flag, Gift,
  Handshake, Heart, Image, Lightbulb, Link as LinkIcon, Mail, Megaphone, NotebookPen,
  Package, Palette, PartyPopper, Phone, Rocket, Shirt, Sparkles, Star, Tag, Target,
  Telescope, TrendingUp, Truck, Users,
  type LucideIcon,
} from "lucide-react";

const MAPA: Record<string, LucideIcon> = {
  "notebook-pen": NotebookPen,
  "party-popper": PartyPopper,
  lightbulb: Lightbulb,
  tag: Tag,
  shirt: Shirt,
  camera: Camera,
  crown: Crown,
  "calendar-days": CalendarDays,
  users: Users,
  target: Target,
  "trending-up": TrendingUp,
  "dollar-sign": DollarSign,
  package: Package,
  truck: Truck,
  mail: Mail,
  link: LinkIcon,
  palette: Palette,
  image: Image,
  sparkles: Sparkles,
  gift: Gift,
  handshake: Handshake,
  "building-2": Building2,
  phone: Phone,
  "clipboard-list": ClipboardList,
  flag: Flag,
  star: Star,
  heart: Heart,
  rocket: Rocket,
  megaphone: Megaphone,
  telescope: Telescope,
};

export function IconeCampo({ nome, className }: { nome: string; className?: string }) {
  const Icone = MAPA[nome] ?? NotebookPen;
  return <Icone className={className ?? "size-4"} />;
}
