import {
  addDependenciesToPackageJson,
  ensurePackage,
  formatFiles,
  generateFiles,
  GeneratorCallback,
  names,
  offsetFromRoot,
  readProjectConfiguration,
  Tree,
} from '@nrwl/devkit';
import { Linter } from '@nrwl/linter';
import * as path from 'path';
import {
  ensureMdxTypeInTsConfig,
  ensureRootTsxExists,
} from '../../utils/ensure-file-utils';
import { getInstalledNxVersion } from '../../utils/get-installed-nx-version';
import {
  storybookFrameworkQwikVersion,
  storybookReactDOMVersion,
  storybookReactVersion,
  typesMdx,
} from '../../utils/versions';
import {
  NormalizedSchema,
  StorybookConfigurationGeneratorSchema,
} from './schema';

function addFiles(tree: Tree, options: StorybookConfigurationGeneratorSchema) {
  const { root } = readProjectConfiguration(tree, options.name);

  tree.delete(path.join(root, '.storybook/main.js'));

  const templateOptions = {
    ...options,
    ...names(options.name),
    offsetFromRoot: offsetFromRoot(root),
    projectRoot: root,
    configExtension: options.tsConfiguration ? 'ts' : 'js',
  };
  generateFiles(tree, path.join(__dirname, 'files'), root, templateOptions);

  ensureRootTsxExists(tree, options.name);
  ensureMdxTypeInTsConfig(tree, options.name);
}

function normalizeOptions(
  options: StorybookConfigurationGeneratorSchema
): NormalizedSchema {
  return {
    ...options,
    js: !!options.js,
    linter: options.linter ?? Linter.EsLint,
    tsConfiguration: options.tsConfiguration ?? true,
  };
}

export async function storybookConfigurationGenerator(
  tree: Tree,
  options: StorybookConfigurationGeneratorSchema
): Promise<GeneratorCallback> {
  const normalizedOptions = normalizeOptions(options);
  const nxVersion = getInstalledNxVersion(tree);

  ensurePackage('@nrwl/storybook', nxVersion);
  const { configurationGenerator } = await import('@nrwl/storybook');

  await configurationGenerator(tree, {
    storybook7UiFramework: '@storybook/html-webpack5',
    uiFramework: '@storybook/html',
    bundler: 'vite',
    name: normalizedOptions.name,
    js: normalizedOptions.js,
    linter: normalizedOptions.linter,
    tsConfiguration: normalizedOptions.tsConfiguration,
    storybook7Configuration: true,
    configureCypress: false,
    // @ts-expect-error providing params in the old format for nx 15.8
    storybook7betaConfiguration: true,
  });

  addFiles(tree, normalizedOptions);
  await formatFiles(tree);

  return addStorybookDependencies(tree);
}

async function addStorybookDependencies(
  tree: Tree
): Promise<GeneratorCallback> {
  const { storybook7Version } = await import(
    '@nrwl/storybook/src/utils/versions'
  );

  return addDependenciesToPackageJson(
    tree,
    {},
    {
      'storybook-framework-qwik': storybookFrameworkQwikVersion,
      '@storybook/builder-vite': storybook7Version,
      '@storybook/addon-docs': storybook7Version,
      react: storybookReactVersion,
      'react-dom': storybookReactDOMVersion,
      '@types/mdx': typesMdx,
    }
  );
}

export default storybookConfigurationGenerator;