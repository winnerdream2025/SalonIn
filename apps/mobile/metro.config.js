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

// Block the duplicate react-native@0.74.5 instance pulled in by packages/ui
// (different @types/react peer) so Metro always resolves to the app's single copy
const duplicateReactNativePath = path.resolve(
  workspaceRoot,
  'node_modules/.pnpm/react-native@0.74.5_@babel+core@7.29.7_@babel+preset-env@7.29.7_@babel+core@7.29.7__@types+react@18.3.29_react@18.3.1'
)
config.resolver.blockList = [
  new RegExp('^' + duplicateReactNativePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '.*'),
]

// Force a single copy of React across the entire bundle
const singletonModules = {
  'react': path.resolve(projectRoot, 'node_modules/react'),
  'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
  'react/jsx-runtime': path.resolve(projectRoot, 'node_modules/react/jsx-runtime'),
  'react/jsx-dev-runtime': path.resolve(projectRoot, 'node_modules/react/jsx-dev-runtime'),
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
