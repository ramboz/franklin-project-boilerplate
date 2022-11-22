import {
  buildBlock,
  getMetadata,
  init,
  loadCSS,
  plugins,
  toCamelCase,
  withPlugin,
} from './lib-franklin.js';

const LCP_BLOCKS = []; // add your LCP blocks to the list
window.hlx.RUM_GENERATION = 'project-1'; // add your RUM generation information here

await withPlugin('./plugins/experimentation-ued/index.js', {
  condition: () => !!getMetadata('experiment'),
  basePath: '/franklin-experiments',
  configFile: 'franklin-experiment.json',
  parser: (json) => {
    const config = {};
    try {
      const keyMap = {
        'Experiment Name': 'label',
      };
      Object.values(json.settings.data).reduce((cfg, entry) => {
        const key = keyMap[entry.Name] || toCamelCase(entry.Name);
        cfg[key] = key === 'blocks' ? entry.Value.split(/[,\n]/) : entry.Value;
        return cfg;
      }, config);

      config.variantNames = [];
      config.variants = {};
      json.variants.data.forEach((row) => {
        const {
          Name, Label, Split, Page, Block,
        } = row;
        const variantName = toCamelCase(Name);
        config.variantNames.push(variantName);
        config.variants[variantName] = {
          label: Label,
          percentageSplit: Split,
          content: Page ? Page.trim().split(',') : [],
          code: Block ? Block.trim().split(',') : [],
        };
      });
      return config;
    } catch (e) {
      console.log('error parsing experiment config:', e);
    }
    return null;
  },
});

function buildHeroBlock(main) {
  const h1 = main.querySelector('h1');
  const picture = main.querySelector('picture');
  // eslint-disable-next-line no-bitwise
  if (h1 && picture && (h1.compareDocumentPosition(picture) & Node.DOCUMENT_POSITION_PRECEDING)) {
    const section = document.createElement('div');
    section.append(buildBlock('hero', { elems: [picture, h1] }));
    main.prepend(section);
  }
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
function buildAutoBlocks(main) {
  try {
    buildHeroBlock(main);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
export function decorateMain(main) {
  // hopefully forward compatible button decoration
  plugins.decorator.decorateButtons(main);
  plugins.decorator.decorateIcons(main);
  buildAutoBlocks(main);
}

/**
 * loads everything needed to get to LCP.
 */
async function loadEager(doc) {
  document.documentElement.lang = 'en';
  const main = doc.querySelector('main');
  if (main) {
    decorateMain(main);
  }
}

/**
 * Adds the favicon.
 * @param {string} href The favicon URL
 */
export function addFavIcon(href) {
  const link = document.createElement('link');
  link.rel = 'icon';
  link.type = 'image/svg+xml';
  link.href = href;
  const existingLink = document.querySelector('head link[rel="icon"]');
  if (existingLink) {
    existingLink.parentElement.replaceChild(link, existingLink);
  } else {
    document.getElementsByTagName('head')[0].appendChild(link);
  }
}

/**
 * loads everything that doesn't need to be delayed.
 */
async function loadLazy(doc) {
  const main = doc.querySelector('main');

  const { hash } = window.location;
  const element = hash ? main.querySelector(hash) : false;
  if (hash && element) element.scrollIntoView();

  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  addFavIcon(`${window.hlx.codeBasePath}/styles/favicon.svg`);
}

/**
 * loads everything that happens a lot later, without impacting
 * the user experience.
 */
function loadDelayed() {
  // load anything that can be postponed to the latest here
  import('./delayed.js');
}

init({
  loadEager,
  loadLazy,
  loadDelayed,
  lcpblocks: LCP_BLOCKS,
});
