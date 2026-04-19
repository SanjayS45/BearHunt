import {
  Droplets, Smartphone, Wallet, Key, Shirt, Backpack,
  Laptop, BookOpen, CreditCard, Headphones, Plug, HelpCircle,
} from 'lucide-react'

const icons: Record<string, React.ElementType> = {
  water_bottle: Droplets,
  phone: Smartphone,
  wallet: Wallet,
  keys: Key,
  clothing: Shirt,
  bag: Backpack,
  electronics: Laptop,
  book: BookOpen,
  id_card: CreditCard,
  headphones: Headphones,
  charger: Plug,
  other: HelpCircle,
}

interface CategoryIconProps {
  category: string
  className?: string
  size?: number
}

export function CategoryIcon({ category, className, size = 20 }: CategoryIconProps) {
  const Icon = icons[category] ?? HelpCircle
  return <Icon size={size} strokeWidth={1.5} className={className} />
}
