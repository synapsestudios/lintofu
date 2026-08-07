import { defineConfig } from 'vitepress';
import {
  buildRuleSidebar,
  toRuleIndexEntries,
} from '../../scripts/render-rule-index.js';
import { rules } from '../../src/rules/index.js';

export default defineConfig({
  title: 'lintofu',
  description: 'An ESLint plugin for linting OpenTofu configurations.',
  // GitHub Pages serves a project site under the repository name.
  base: '/lintofu/',
  srcExclude: ['adr/**'],
  themeConfig: {
    search: { provider: 'local' },
    nav: [
      { text: 'User guide', link: '/user-guide/getting-started' },
      { text: 'Developer guide', link: '/developer-guide/architecture' },
      { text: 'Rules', link: '/rules/' },
    ],
    sidebar: {
      '/user-guide/': [
        {
          text: 'User guide',
          items: [
            { text: 'Getting started', link: '/user-guide/getting-started' },
            { text: 'Configuration', link: '/user-guide/configuration' },
          ],
        },
      ],
      '/developer-guide/': [
        {
          text: 'Developer guide',
          items: [
            { text: 'Architecture', link: '/developer-guide/architecture' },
            {
              text: 'Parser services',
              link: '/developer-guide/parser-services',
            },
            {
              text: 'Writing a rule',
              link: '/developer-guide/writing-a-rule',
            },
          ],
        },
      ],
      '/rules/': buildRuleSidebar(toRuleIndexEntries(rules)),
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/synapsestudios/lintofu' },
    ],
  },
});
