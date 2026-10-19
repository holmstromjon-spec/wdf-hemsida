// Site navigation. Same pages and URLs as the old WordPress menu.
export type NavItem = { label: string; href: string; children?: NavItem[] };

export const nav: NavItem[] = [
  {
    label: 'Dansa med oss',
    href: '/dansa-med-oss/',
    children: [
      { label: 'Våra dansstilar', href: '/dansstilar/' },
      { label: 'Våra instruktörer', href: '/instruktorer/' },
      { label: 'Jobba hos oss?', href: '/jobba-hos-oss/' },
    ],
  },
  { label: 'Tävlingsdans', href: '/tavlingsdans/' },
  { label: 'Schema', href: '/schema/' },
  { label: 'Anmälan', href: '/anmalan/' },
  { label: 'Priser', href: '/priser/' },
  { label: 'Om oss', href: '/om-oss/' },
  { label: 'Galleri', href: '/gallerifoo/' },
  { label: 'Kontakt', href: '/kontakt/' },
  { label: 'Butik', href: '/shop/' },
];

// Shown directly in the header on wide screens; everything is in the menu.
export const quickNav: NavItem[] = [
  { label: 'Schema', href: '/schema/' },
  { label: 'Priser', href: '/priser/' },
  { label: 'Butik', href: '/shop/' },
];
