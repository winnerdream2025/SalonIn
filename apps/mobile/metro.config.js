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

  // Force singleton for React to prevent duplicate copies
  if (singletonModules[moduleName]) {
    return {
      type: 'sourceFile',
      filePath: require.resolve(moduleName, { paths: [projectRoot] }),
    }
  }

  return context.resolveRequest(context, moduleName, platform)
}

module.exports = config
