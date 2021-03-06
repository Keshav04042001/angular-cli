/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { resolve } from 'path';
import * as webpack from 'webpack';
import { WebpackConfigOptions } from '../../utils/build-options';
import { withWebpackFourOrFive } from '../../utils/webpack-version';
import { CommonJsUsageWarnPlugin } from '../plugins';
import { HmrLoader } from '../plugins/hmr/hmr-loader';
import { getSourceMapDevTool } from '../utils/helpers';

export function getBrowserConfig(wco: WebpackConfigOptions): webpack.Configuration {
  const { buildOptions } = wco;
  const {
    crossOrigin = 'none',
    subresourceIntegrity,
    extractLicenses,
    vendorChunk,
    commonChunk,
    allowedCommonJsDependencies,
    hmr,
  } = buildOptions;

  const extraPlugins = [];

  const {
    styles: stylesSourceMap,
    scripts: scriptsSourceMap,
    hidden: hiddenSourceMap,
    vendor: vendorSourceMap,
  } = buildOptions.sourceMap;

  if (subresourceIntegrity) {
    const SubresourceIntegrityPlugin = require('webpack-subresource-integrity');
    extraPlugins.push(new SubresourceIntegrityPlugin({
      hashFuncNames: ['sha384'],
    }));
  }

  if (extractLicenses) {
    const LicenseWebpackPlugin = require('license-webpack-plugin').LicenseWebpackPlugin;
    extraPlugins.push(new LicenseWebpackPlugin({
      stats: {
        warnings: false,
        errors: false,
      },
      perChunkOutput: false,
      outputFilename: '3rdpartylicenses.txt',
    }));
  }

  if (scriptsSourceMap || stylesSourceMap) {
    extraPlugins.push(getSourceMapDevTool(
      scriptsSourceMap,
      stylesSourceMap,
      buildOptions.differentialLoadingMode ? true : hiddenSourceMap,
      false,
      vendorSourceMap,
    ));
  }

  let crossOriginLoading: 'anonymous' | 'use-credentials' | false = false;
  if (subresourceIntegrity && crossOrigin === 'none') {
    crossOriginLoading = 'anonymous';
  } else if (crossOrigin !== 'none') {
    crossOriginLoading = crossOrigin;
  }

  const extraRules: webpack.RuleSetRule[] = [];
  if (hmr) {
    extraRules.push({
      loader: HmrLoader,
      include: [buildOptions.main].map(p => resolve(wco.root, p)),
    });

    extraPlugins.push(new webpack.HotModuleReplacementPlugin());
  }

  return {
    devtool: false,
    resolve: {
      mainFields: ['es2015', 'browser', 'module', 'main'],
    },
    module: {
      rules: extraRules,
    },
    ...withWebpackFourOrFive({}, { target: ['web', 'es5'] }),
    output: {
      crossOriginLoading,
    },
    optimization: {
      runtimeChunk: 'single',
      splitChunks: {
        maxAsyncRequests: Infinity,
        cacheGroups: {
          default: !!commonChunk && {
            chunks: 'async',
            minChunks: 2,
            priority: 10,
          },
          common: !!commonChunk && {
            name: 'common',
            chunks: 'async',
            minChunks: 2,
            enforce: true,
            priority: 5,
          },
          vendors: false,
          defaultVendors: !!vendorChunk && {
            name: 'vendor',
            chunks: (chunk) => chunk.name === 'main',
            enforce: true,
            test: /[\\/]node_modules[\\/]/,
          },
        },
      },
    },
    plugins: [
      new CommonJsUsageWarnPlugin({
        allowedDependencies: allowedCommonJsDependencies,
      }),
      ...extraPlugins,
    ],
    node: false,
  };
}
