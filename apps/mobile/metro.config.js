const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)

// Watch the entire monorepo so Metro can resolve workspace packages
config.watchFolders = [workspaceRoot]

// Tell Metro to look for modules in both the project and workspace root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
]

// Block duplicate pnpm instances so Metro always uses the app's single canonical copy
const duplicateReactNativePath = path.resolve(
  workspaceRoot,
  'node_modules/.pnpm/react-native@0.74.5_@babel+core@7.29.7_@babel+preset-env@7.29.7_@babel+core@7.29.7__@types+react@18.3.29_react@18.3.1'
)
// packages/ui has its own devDep copy of react-native-svg which pnpm resolves to a
// different pnpm instance (different peer hash). Block it so only the app's copy is used.
const duplicateSvgPath = path.resolve(
  workspaceRoot,
  'node_modules/.pnpm/react-native-svg@15.2.0_react-native@0.74.5_@babel+core@7.29.7_@babel+preset-env@7.29.7_@babe_hojvwub3ij4ex2ke74ony53vq4'
)
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
config.resolver.blockList = [
  new RegExp('^' + escapeRegex(duplicateReactNativePath) + '.*'),
  new RegExp('^' + escapeRegex(duplicateSvgPath) + '.*'),
]

// Hard-map singleton packages so Metro always resolves them to the app's node_modules,
// regardless of which workspace package originated the import.
// Also map 'App' so pnpm-deep expo/AppEntry.js (which does `import App from '../../App'`)
// can find the expo-router entry point correctly in the monorepo.
config.resolver.extraNodeModules = {
  'react-native-svg': path.resolve(projectRoot, 'node_modules/react-native-svg'),
  'App': path.resolve(projectRoot, 'node_modules/expo-router/entry'),
}

// Force a single copy of React and native modules across the entire bundle
const singletonModules = {
  'react': path.resolve(projectRoot, 'node_modules/react'),
  'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
  'react/jsx-runtime': path.resolve(projectRoot, 'node_modules/react/jsx-runtime'),
  'react/jsx-dev-runtime': path.resolve(projectRoot, 'node_modules/react/jsx-dev-runtime'),
  'react-native-svg': path.resolve(projectRoot, 'node_modules/react-native-svg'),
}

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Replace server-only Prisma with enum shim for mobile
  if (
    moduleName === '@prisma/client' ||
    moduleName.startsWith('@prisma/') ||
    moduleName.startsWith('.prisma/')
  ) {
    return {
      type: 'sourceFile',
      filePath: path.resolve(projectRoot, 'prisma-enums.js'),
    }
  }

  // Force singleton for React/React Native to prevent duplicate copies
  if (singletonModules[moduleName]) {
    return {
      type: 'sourceFile',
      filePath: require.resolve(moduleName, { paths: [projectRoot] }),
    }
  }

  return context.resolveRequest(context, moduleName, platform)
}

module.exports = config
