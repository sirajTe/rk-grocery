const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', viewBox: '0 0 24 24' }
const Icon = ({ d, className = 'h-5 w-5', children }) => (
  <svg {...base} className={className} aria-hidden="true">{d ? <path d={d} /> : children}</svg>
)

export const SearchIcon = (p) => <Icon {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Icon>
export const CartIcon = (p) => <Icon {...p}><path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6" /><circle cx="10" cy="20" r="1.3" /><circle cx="17" cy="20" r="1.3" /></Icon>
export const MenuIcon = (p) => <Icon {...p} d="M4 7h16M4 12h16M4 17h16" />
export const CloseIcon = (p) => <Icon {...p} d="M6 6l12 12M18 6 6 18" />
export const PlusIcon = (p) => <Icon {...p} d="M12 5v14M5 12h14" />
export const MinusIcon = (p) => <Icon {...p} d="M5 12h14" />
export const ArrowIcon = (p) => <Icon {...p} d="M5 12h14m-6-6 6 6-6 6" />
export const TruckIcon = (p) => <Icon {...p}><path d="M3 6h11v10H3zM14 9h4l3 3v4h-7" /><circle cx="7" cy="18" r="1.8" /><circle cx="17.5" cy="18" r="1.8" /></Icon>
export const TagIcon = (p) => <Icon {...p}><path d="M3 12V4h8l10 10-8 8z" /><circle cx="7.5" cy="8.5" r="1.3" /></Icon>
export const ShieldIcon = (p) => <Icon {...p}><path d="M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6z" /><path d="m9 12 2 2 4-4" /></Icon>
export const ClockIcon = (p) => <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Icon>
export const GiftIcon = (p) => <Icon {...p}><path d="M4 11h16v10H4zM3 7h18v4H3zM12 7v14" /><path d="M12 7C10 3 6.5 4 7.5 6.5 8 7.5 12 7 12 7Zm0 0c2-4 5.5-3 4.5-.5-.5 1-4.5.5-4.5.5Z" /></Icon>
export const SparkIcon = (p) => <Icon {...p} d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" />
export const PinIcon = (p) => <Icon {...p}><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11Z" /><circle cx="12" cy="10" r="2.5" /></Icon>
export const PhoneIcon = (p) => <Icon {...p} d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
export const MailIcon = (p) => <Icon {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></Icon>
export const EyeIcon = (p) => <Icon {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></Icon>
export const BuildingIcon = (p) => <Icon {...p}><path d="M4 21V5l8-2v18M12 8h8v13M8 8v.01M8 12v.01M8 16v.01M16 12v.01M16 16v.01M2 21h20" /></Icon>

export const WhatsAppIcon = ({ className = 'h-5 w-5' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.4-.5c.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3ZM12 21.8c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4A9.8 9.8 0 1 1 12 21.8Zm0-21.6A11.8 11.8 0 0 0 1.9 17.9L.2 24l6.3-1.6A11.8 11.8 0 1 0 12 .2Z" />
  </svg>
)
export const BackIcon = (p) => <Icon {...p} d="M15 6l-6 6 6 6" />
export const ChevronIcon = (p) => <Icon {...p} d="m6 9 6 6 6-6" />
export const BoltIcon = (p) => <Icon {...p} d="M13 2 4 14h7l-1 8 9-12h-7z" />
export const UserIcon = (p) => <Icon {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></Icon>
export const BillIcon = (p) => <Icon {...p}><path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h3" /></Icon>
