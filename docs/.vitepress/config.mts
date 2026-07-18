import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'E-Comm & Delivery Docs',
  description:
    'Marketplace implementation guides and Delivery-as-a-Service product, API, operations, and integration documentation',
  cleanUrls: true,
  lastUpdated: true,
  ignoreDeadLinks: false,

  themeConfig: {
    siteTitle: 'E-Comm & Delivery',
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Delivery Platform', link: '/delivery/' },
      { text: 'Integrations', link: '/delivery/guides/platform-integration-handbook' },
      { text: 'OpenAPI', link: '/delivery/openapi' },
      { text: 'Marketplace docs', link: '/guide' },
      { text: 'Requirements', link: '/requirment' },
    ],

    sidebar: [
      {
        text: 'Delivery Platform',
        collapsed: false,
        items: [
          { text: 'Documentation index', link: '/delivery/' },
          { text: 'Product definition', link: '/delivery/product-definition' },
          { text: 'Documentation conventions', link: '/delivery/documentation-conventions' },
          { text: 'Architecture', link: '/delivery/architecture' },
          { text: 'Workflows', link: '/delivery/workflows' },
          { text: 'Application interfaces', link: '/delivery/app-interfaces' },
          { text: 'Technical stack', link: '/delivery/technical-stack' },
          { text: 'Contracts', link: '/delivery/contracts' },
          { text: 'OpenAPI', link: '/delivery/openapi' },
          { text: 'Data dictionary', link: '/delivery/data-dictionary' },
          { text: 'Glossary', link: '/delivery/glossary' },
        ],
      },
      {
        text: 'Delivery · Foundation',
        collapsed: true,
        items: [
          { text: 'Identity & RBAC', link: '/delivery/modules/01-identity-auth-rbac' },
          { text: 'Multi-tenancy', link: '/delivery/modules/02-multi-tenancy' },
          { text: 'Businesses & branches', link: '/delivery/modules/03-businesses-branches' },
          { text: 'Cities & zones', link: '/delivery/modules/04-cities-service-zones' },
          { text: 'Delivery lifecycle', link: '/delivery/modules/05-delivery-job-lifecycle' },
        ],
      },
      {
        text: 'Delivery · Operations',
        collapsed: true,
        items: [
          { text: 'Quoting & pricing', link: '/delivery/modules/06-quoting-pricing' },
          { text: 'Dispatch & assignment', link: '/delivery/modules/07-dispatch-assignment' },
          { text: 'Rider & fleet', link: '/delivery/modules/08-rider-fleet-management' },
          { text: 'Partner fleets', link: '/delivery/modules/09-partner-fleet-management' },
          { text: 'Tracking & ETA', link: '/delivery/modules/10-live-tracking-eta' },
          { text: 'Proof', link: '/delivery/modules/11-proof-of-pickup-delivery' },
          { text: 'Exceptions & returns', link: '/delivery/modules/12-exceptions-returns' },
        ],
      },
      {
        text: 'Delivery · Modes',
        collapsed: false,
        items: [
          { text: 'Mode selection & shared flow', link: '/delivery/modes/' },
          { text: 'On-demand', link: '/delivery/modes/01-on-demand' },
          { text: 'Scheduled', link: '/delivery/modes/02-scheduled' },
          { text: 'Bulk', link: '/delivery/modes/03-bulk' },
          { text: 'Multi-stop / routes', link: '/delivery/modes/04-multi-stop-routes' },
          { text: 'Multi-city', link: '/delivery/modes/05-multi-city' },
          { text: 'Returns', link: '/delivery/modes/06-returns' },
          { text: 'Cross-mode rules & tests', link: '/delivery/modes/07-cross-mode-rules-and-testing' },
          { text: 'Mode API contracts', link: '/delivery/modes/08-mode-api-contracts' },
        ],
      },
      {
        text: 'Delivery · Integrations',
        collapsed: true,
        items: [
          { text: 'Public API', link: '/delivery/modules/13-public-api-developer-platform' },
          { text: 'API keys & idempotency', link: '/delivery/modules/14-api-keys-idempotency-rate-limits' },
          { text: 'Webhooks', link: '/delivery/modules/15-webhooks-outbox-retries' },
          { text: 'Commerce plugins', link: '/delivery/modules/16-commerce-plugins' },
          { text: 'Notifications', link: '/delivery/modules/17-notifications-communications' },
          { text: 'Bulk & batches', link: '/delivery/modules/18-bulk-import-batches' },
          { text: 'Scheduling & routes', link: '/delivery/modules/19-scheduling-multi-stop-routing' },
          { text: 'White-label tracking', link: '/delivery/modules/20-white-label-tracking' },
        ],
      },
      {
        text: 'Delivery · Finance & Control',
        collapsed: true,
        items: [
          { text: 'Billing & ledger', link: '/delivery/modules/21-billing-ledger' },
          { text: 'COD & custody', link: '/delivery/modules/22-cod-cash-custody' },
          { text: 'Settlements & payouts', link: '/delivery/modules/23-invoicing-settlements-payouts' },
          { text: 'Platform admin', link: '/delivery/modules/24-platform-admin' },
          { text: 'Reporting', link: '/delivery/modules/25-reporting-analytics' },
          { text: 'Support & disputes', link: '/delivery/modules/26-support-disputes' },
          { text: 'Audit & observability', link: '/delivery/modules/27-audit-observability' },
          { text: 'Security & privacy', link: '/delivery/modules/28-security-privacy-compliance' },
          { text: 'Configuration', link: '/delivery/modules/29-configuration-feature-flags' },
          { text: 'Fraud & risk', link: '/delivery/modules/30-fraud-risk-controls' },
        ],
      },
      {
        text: 'Delivery · Guides',
        collapsed: true,
        items: [
          { text: 'Merchant quickstart', link: '/delivery/guides/merchant-quickstart' },
          { text: 'API integration', link: '/delivery/guides/api-integration-guide' },
          { text: 'Platform integrations', link: '/delivery/guides/platform-integration-handbook' },
          { text: 'Webhook consumer', link: '/delivery/guides/webhook-consumer-guide' },
          { text: 'Operations playbook', link: '/delivery/guides/operations-playbook' },
          { text: 'Rider operations', link: '/delivery/guides/rider-operations-guide' },
          { text: 'Finance reconciliation', link: '/delivery/guides/finance-reconciliation-guide' },
        ],
      },
      {
        text: 'Delivery · Reference',
        collapsed: true,
        items: [
          { text: 'Decision register', link: '/delivery/decision-register' },
          { text: 'Access control matrix', link: '/delivery/access-control-matrix' },
          { text: 'Non-functional requirements', link: '/delivery/non-functional-requirements' },
          { text: 'Testing strategy', link: '/delivery/testing-strategy' },
          { text: 'Release & operations', link: '/delivery/release-operations' },
          { text: 'Roadmap', link: '/delivery/roadmap' },
          { text: 'Requirements traceability', link: '/delivery/requirements-traceability' },
          { text: 'UX principles', link: '/delivery/ux-principles' },
        ],
      },
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

    footer: {
      message: 'Documentation only — application code is specified, not shipped from this repository.',
      copyright: 'Delivery-as-a-Service and marketplace architecture specs',
    },
  },
})
