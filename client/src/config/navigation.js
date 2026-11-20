import {
  MessageSquare,
  Calendar,
  Shield,
  FileText,
  CheckCircle,
  Search,
  Languages,
  ScanLine,
  Bell,
  LayoutDashboard,
  Users,
  MessagesSquare,
  Activity,
  ClipboardCheck,
  CalendarDays,
  UsersRound,
  ScrollText,
  FolderOpen,
  UserRound
} from 'lucide-react';
import { features } from './features';

/**
 * Single source of truth for all CampusMate navigation surfaces.
 * Filters items automatically based on active feature flags.
 */

// Dropdown features for the Landing navbar
export const featureDropdownItems = [
  {
    id: 'feat-search',
    label: 'Hybrid search',
    description: 'Combines BM25 keywords with vector embeddings for precision',
    to: '/#features',
    icon: Search
  },
  {
    id: 'feat-multilingual',
    label: 'Multilingual support',
    description: 'Natural answers in English, Hindi, Gujarati, Hinglish & Gujlish',
    to: '/#languages',
    icon: Languages
  },
  {
    id: 'feat-citations',
    label: 'Verified citations',
    description: 'Every statement is cross-referenced with official source notices',
    to: '/#how-it-works',
    icon: CheckCircle
  },
  {
    id: 'feat-ocr',
    label: 'OCR for notices',
    description: 'Extracts tabular & handwritten text from scanned circulars',
    to: '/#features',
    icon: ScanLine
  },
  {
    id: 'feat-calendar',
    label: 'Calendar reminders',
    description: 'Auto-extracts deadlines with one-click export & live iCal sync',
    to: '/calendar',
    icon: Bell,
    featureFlag: 'calendar'
  }
].filter((item) => !item.featureFlag || features[item.featureFlag]);

// Top landing links
export const landingLinks = [
  { id: 'home', label: 'Home', to: '/#home' },
  { id: 'features', label: 'Features', to: '/#features' },
  { id: 'how-it-works', label: 'How it works', to: '/#how' },
  { id: 'documents', label: 'Documents', to: '/documents' },
  {
    id: 'calendar',
    label: 'Dates',
    to: '/calendar',
    featureFlag: 'calendar'
  },
  { id: 'about', label: 'About', to: '/#about' },
  { id: 'contact', label: 'Contact', to: '/#contact' }
].filter((item) => !item.featureFlag || features[item.featureFlag]);

// App shell links (/app, /chat, etc.)
export const appLinks = [
  { id: 'chat', label: 'Chat', to: '/app', icon: MessageSquare },
  { id: 'documents', label: 'Documents', to: '/documents', icon: FolderOpen },
  {
    id: 'calendar',
    label: 'Important dates',
    to: '/calendar',
    icon: Calendar,
    featureFlag: 'calendar'
  },
  {
    id: 'profile',
    label: 'Profile',
    to: '/profile',
    icon: UserRound,
    requiresAuth: true
  },
  {
    id: 'admin',
    label: 'Admin console',
    to: '/admin/dashboard',
    icon: Shield,
    requiresAdmin: true
  }
].filter((item) => !item.featureFlag || features[item.featureFlag]);

// Admin sticky tab navigation (/admin/*)
export const adminTabs = [
  { id: 'dashboard', label: 'Dashboard', to: '/admin/dashboard', end: true, icon: LayoutDashboard },
  { id: 'students', label: 'Students', to: '/admin/students', icon: Users },
  { id: 'documents', label: 'Documents', to: '/admin/documents', icon: FileText },
  { id: 'chats', label: 'Chats', to: '/admin/chats', icon: MessagesSquare },
  { id: 'activity', label: 'Activity', to: '/admin/activity', icon: Activity },
  { id: 'review', label: 'Review', to: '/admin/review', icon: ClipboardCheck, badgeKey: 'review' },
  {
    id: 'dates',
    label: 'Dates',
    to: '/admin/dates',
    icon: CalendarDays,
    badgeKey: 'dates',
    featureFlag: 'calendar'
  },
  { id: 'team', label: 'Team', to: '/admin/team', icon: UsersRound, superadminOnly: true },
  { id: 'audit', label: 'Audit', to: '/admin/audit', icon: ScrollText, superadminOnly: true }
].filter((item) => !item.featureFlag || features[item.featureFlag]);

// Compact alias kept for legacy imports.
export const adminNav = adminTabs;

// Footer navigation link groups
export const footerGroups = [
  {
    title: 'Product',
    links: [
      { id: 'f-chat', label: 'Chat Assistant', to: '/app' },
      {
        id: 'f-docs',
        label: 'Document Library',
        to: '/documents'
      },
      {
        id: 'f-dates',
        label: 'Important Dates',
        to: '/calendar',
        featureFlag: 'calendar'
      },
      { id: 'f-features', label: 'Features', to: '/#features' },
      { id: 'f-how', label: 'How it works', to: '/#how-it-works' },
      { id: 'f-faq', label: 'FAQ', to: '/#faq' }
    ].filter((item) => !item.featureFlag || features[item.featureFlag])
  },
  {
    title: 'Campus',
    links: [
      { id: 'f-about', label: 'About', to: '/#about' },
      { id: 'f-contact', label: 'Helpdesk & Contact', to: '/#contact' },
      {
        id: 'f-portal',
        label: 'Student Portal',
        href: 'https://www.pdeu.ac.in',
        external: true
      }
    ]
  },
  {
    title: 'Admin',
    links: [
      { id: 'f-login', label: 'Admin login', to: '/admin/login' },
      { id: 'f-dash', label: 'Admin console', to: '/admin/dashboard', requiresAdmin: true }
    ]
  }
];

export default {
  landingLinks,
  featureDropdownItems,
  appLinks,
  adminTabs,
  adminNav,
  footerGroups
};
