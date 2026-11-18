import {
  MessageSquare,
  Calendar,
  History,
  Shield,
  Settings,
  FileText,
  CheckCircle,
  Clock,
  BarChart3,
  Search,
  Languages,
  ScanLine,
  Bell
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
    badge: 'New',
    featureFlag: 'calendar'
  }
].filter((item) => !item.featureFlag || features[item.featureFlag]);

// Top landing links
export const landingLinks = [
  { id: 'home', label: 'Home', to: '/#home' },
  { id: 'features', label: 'Features', to: '/#features' },
  { id: 'how-it-works', label: 'How it works', to: '/#how' },
  {
    id: 'calendar',
    label: 'Dates',
    to: '/calendar',
    badge: 'New',
    featureFlag: 'calendar'
  },
  { id: 'about', label: 'About', to: '/#about' },
  { id: 'contact', label: 'Contact', to: '/#contact' }
].filter((item) => !item.featureFlag || features[item.featureFlag]);

// App shell links (/app, /chat, etc.)
export const appLinks = [
  { id: 'chat', label: 'Chat', to: '/app', icon: MessageSquare },
  {
    id: 'calendar',
    label: 'Important dates',
    to: '/calendar',
    icon: Calendar,
    badge: 'New',
    featureFlag: 'calendar'
  },
  {
    id: 'admin',
    label: 'Admin',
    to: '/admin',
    icon: Shield,
    requiresAdmin: true
  },
  { id: 'settings', label: 'Settings', to: '/admin/settings', icon: Settings, requiresAdmin: true }
].filter((item) => !item.featureFlag || features[item.featureFlag]);

// Admin sticky tab navigation (/admin/*)
export const adminTabs = [
  { id: 'dashboard', label: 'Overview', to: '/admin', end: true, icon: BarChart3 },
  { id: 'documents', label: 'Documents', to: '/admin/documents', icon: FileText, badgeKey: 'documents' },
  { id: 'review', label: 'Review queue', to: '/admin/feedback', icon: CheckCircle, badgeKey: 'review' },
  {
    id: 'dates',
    label: 'Dates review',
    to: '/admin/documents?tab=dates',
    icon: Clock,
    badgeKey: 'dates',
    featureFlag: 'calendar'
  },
  { id: 'analytics', label: 'Analytics', to: '/admin/analytics', icon: BarChart3 }
].filter((item) => !item.featureFlag || features[item.featureFlag]);

// Footer navigation link groups
export const footerGroups = [
  {
    title: 'Product',
    links: [
      { id: 'f-chat', label: 'Chat Assistant', to: '/app' },
      {
        id: 'f-dates',
        label: 'Important Dates',
        to: '/calendar',
        badge: 'New',
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
      { id: 'f-dash', label: 'Analytics Dashboard', to: '/admin', requiresAdmin: true },
      { id: 'f-docs', label: 'Document Ingestion', to: '/admin/documents', requiresAdmin: true }
    ]
  }
];

export default {
  landingLinks,
  featureDropdownItems,
  appLinks,
  adminTabs,
  footerGroups
};
