import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'E-Comm Platform Docs',
  description:
    'Front-end and back-end system design for buyers and sellers — implementation docs',
  cleanUrls: true,
  lastUpdated: true,

  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Requirements', link: '/requirment' },
      { text: 'System overview', link: '/system-documentation' },
      { text: 'Implementation', link: '/implementation/conventions' },
    ],

    sidebar: [
      {
        text: 'Start here',
        items: [
          { text: 'Index', link: '/' },
          { text: 'Source requirements', link: '/requirment' },
          { text: 'System documentation', link: '/system-documentation' },
          { text: 'Conventions', link: '/implementation/conventions' },
          {
            text: 'Auth, registration & KYC',
            link: '/implementation/auth-registration-kyc',
          },
        ],
      },
      {
        text: 'Architecture',
        items: [
          { text: 'System overview', link: '/implementation/system-overview' },
          { text: 'Shared database', link: '/implementation/shared-database' },
          { text: 'Transaction flow', link: '/implementation/transaction-flow' },
          {
            text: 'Bootstrapped launch',
            link: '/implementation/bootstrapped-launch',
          },
        ],
      },
      {
        text: 'Buyer front end',
        collapsed: false,
        items: [
          {
            text: 'Homepage feed',
            link: '/implementation/buyer-homepage-feed',
          },
          {
            text: 'Search and filters',
            link: '/implementation/buyer-search-and-filters',
          },
          {
            text: 'Seller profile pages',
            link: '/implementation/buyer-seller-profile-pages',
          },
          {
            text: 'Product detail page',
            link: '/implementation/buyer-product-detail-page',
          },
          {
            text: 'Cart and checkout',
            link: '/implementation/buyer-cart-and-checkout',
          },
          {
            text: 'Order tracking',
            link: '/implementation/buyer-order-tracking',
          },
          {
            text: 'Account area',
            link: '/implementation/buyer-account-area',
          },
          {
            text: 'Design priorities',
            link: '/implementation/buyer-design-priorities',
          },
        ],
      },
      {
        text: 'Seller front end',
        collapsed: false,
        items: [
          { text: 'Onboarding', link: '/implementation/seller-onboarding' },
          {
            text: 'Listing creation',
            link: '/implementation/seller-listing-creation',
          },
          {
            text: 'Dashboard home',
            link: '/implementation/seller-dashboard-home',
          },
          {
            text: 'Order notifications',
            link: '/implementation/seller-order-notifications',
          },
          {
            text: 'Earnings & payouts',
            link: '/implementation/seller-earnings-and-payout-tracker',
          },
          {
            text: 'Profile / portfolio',
            link: '/implementation/seller-profile-portfolio',
          },
          {
            text: 'Radical simplicity',
            link: '/implementation/seller-radical-simplicity',
          },
          {
            text: 'Telegram / WhatsApp bot',
            link: '/implementation/seller-telegram-whatsapp-bot',
          },
          {
            text: 'Tier progress',
            link: '/implementation/seller-tier-progress-indicator',
          },
          {
            text: 'Transparent commission',
            link: '/transparent-commission-display',
          },
        ],
      },
      {
        text: 'Back-end services',
        collapsed: false,
        items: [
          { text: 'Catalog', link: '/implementation/catalog-service' },
          { text: 'Orders', link: '/implementation/order-service' },
          { text: 'Payments', link: '/implementation/payments-service' },
          { text: 'Logistics', link: '/implementation/logistics-service' },
          {
            text: 'Seller management',
            link: '/implementation/seller-management-service',
          },
          { text: 'Admin panel', link: '/implementation/admin-panel' },
        ],
      },
      {
        text: 'Supporting layers',
        items: [
          {
            text: 'Notifications',
            link: '/implementation/notifications-layer',
          },
          {
            text: 'External integrations',
            link: '/implementation/external-integrations',
          },
        ],
      },
    ],

    search: {
      provider: 'local',
    },

    socialLinks: [],

    outline: {
      level: [2, 3],
    },
  },
})
