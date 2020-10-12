const path = require('path');
const resolve = require('resolve');
const { findExisting } = require('./util');

module.exports = function createConfigPlugin(_context, _entry, _asLib, _args) {
  const autoprefixer = require('autoprefixer');
  const CompressionWebpackPlugin = require('compression-webpack-plugin');

  return {
    id: 'vue-maker-plus',
    apply: (api, options) => {
      const isProdEnv = process.env.NODE_ENV === 'production';
      const isDevEnv = process.env.NODE_ENV === 'development';

      options.css.loaderOptions = options.css.loaderOptions || {};
      options.css.loaderOptions.postcss = Object.assign({
        // Necessary for external CSS imports to work
        sourceMap: isDevEnv,
        ident: 'postcss',
        plugins: () => [
          require('postcss-flexbugs-fixes'),
          autoprefixer()
        ]
      }, options.css.loaderOptions.postcss);

      api.chainWebpack(config => {
        let context = _context;
        let entry = _entry;
        let asLib = _asLib;

        if (isProdEnv) {
          config
            .plugin('gzip')
            .use(CompressionWebpackPlugin, [{
              cache: path.join(context, './node_modules/.cache/compression-webpack-plugin'),
              filename: '[path].gz[query]',
              algorithm: 'gzip',
              threshold: 10240,
              minRatio: 0.8,
              test: new RegExp(
                '\\.(' +
                ['js', 'css'].join('|') +
                ')$'
              )
            }]);
        }

        if (!asLib) {
          // set html plugin template
          const indexFile = findExisting(context, [
            'src/index.html',
            'index.html',
            'public/index.html'
          ]) || path.resolve(__dirname, '../template/index.html');
          if (options.pages) {
            Object.keys(options.pages).forEach(page => {
              config
                .plugin('html-' + page)
                .tap(args => {
                  if (!args[0]) return;
                  if (options.pages[page] && !options.pages[page].template) args[0].template = indexFile;
                  if (isProdEnv) {
                    args[0].minify = Object.assign({}, args[0].minify, {
                      keepClosingSlash: true,
                      minifyJS: true,
                      minifyCSS: true
                    });
                  }
                  return args;
                });
            });
          } else {
            config
              .plugin('html')
              .tap(args => {
                if (!args[0]) return;
                args[0].template = indexFile;
                if (isProdEnv) {
                  args[0].minify = Object.assign({}, args[0].minify, {
                    keepClosingSlash: true,
                    minifyJS: true,
                    minifyCSS: true
                  });
                }
                return args;
              });
          }
        }

        // entry is *.vue file, create alias for built-in js entry
        if (/\.vue$/.test(entry)) {
          config.resolve
            .alias
            .set('~entry', path.resolve(context, entry));
          entry = require.resolve('../template/main.js');
        } else {
          // make sure entry is relative
          if (!/^\.\//.test(entry)) {
            entry = `./${entry}`;
          }
        }

        // ensure core-js polyfills can be imported
        config.resolve
          .alias
          .set('core-js', path.dirname(require.resolve('core-js')))
          .set('regenerator-runtime', path.dirname(require.resolve('regenerator-runtime')));

        // ensure loaders can be resolved properly
        // this is done by locating vue's install location (which is a
        // dependency of the global service)
        const modulePath = path.resolve(require.resolve('vue'), '../../../');
        config.resolveLoader
          .modules
          .add(modulePath);
        config.resolve
          .modules
          .add(modulePath);

        // add resolve alias for vue and vue-hot-reload-api
        // but prioritize versions installed locally.
        try {
          resolve.sync('vue', { basedir: context });
        } catch (e) {
          const vuePath = path.dirname(require.resolve('vue'));
          config.resolve.alias
            .set('vue$', `${vuePath}/${options.compiler ? `vue.esm.js` : `vue.runtime.esm.js`}`);
        }

        try {
          resolve.sync('vue-hot-reload-api', { basedir: context });
        } catch (e) {
          config.resolve.alias
            .set('vue-hot-reload-api', require.resolve('vue-hot-reload-api'));
        }

        // set entry
        if (!options.pages) {
          config
            .entry('app')
            .clear()
            .add(entry);
        }

        const babelOptions = {
          presets: [require.resolve('@vue/babel-preset-app')]
        };

        // set inline babel options
        config.module
          .rule('js')
          .include
          .clear()
          .end()
          .exclude
          .add(/node_modules/)
          .add(/@vue\/cli-service/)
          .end()
          .use('babel-loader')
          .tap(() => babelOptions);

        if (options.lintOnSave) {
          // check eslint config presence
          // otherwise eslint-loader goes all the way up to look for eslintrc, can be
          // messed up when the project is inside another project.
          const ESLintConfigFile = findExisting(context, [
            '.eslintrc.js',
            '.eslintrc.yaml',
            '.eslintrc.yml',
            '.eslintrc.json',
            '.eslintrc',
            'package.json'
          ]);
          const hasESLintConfig = ESLintConfigFile === 'package.json'
            ? !!(require(path.join(context, 'package.json')).eslintConfig)
            : !!ESLintConfigFile;

          // set inline eslint options
          config.module
            .rule('eslint')
            // .include
            // .clear()
            // .end()
            // .exclude
            // .add(/node_modules/)
            // .end()
            .use('eslint-loader')
            .tap(loaderOptions => {
              let opts = null;
              if (hasESLintConfig) {
                opts = {
                  useEslintrc: hasESLintConfig
                };
              } else {
                opts = {
                  baseConfig: {
                    extends: [
                      'plugin:vue/essential',
                      'eslint:recommended'
                    ],
                    parserOptions: {
                      parser: 'babel-eslint'
                    },
                    rules: {
                      'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
                      'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off'
                    }
                  }
                };
              }
              return Object.assign({}, loaderOptions, opts);
            });
        }

        // disable cache
        if (options.noCache || _args.cache === false) {
          // babel-loader
          config.module
            .rule('js')
            .uses
            .delete('cache-loader');

          // eslint-loader
          if (options.lintOnSave) {
            config.module
              .rule('eslint')
              .tap(loaderOptions => {
                return Object.assign({}, loaderOptions, {
                  cache: false
                });
              })
          }

          // terser-webpack-plugin
          config.optimization
            .minimizer('terser')
            .tap(options => {
              if (!options[0]) return;
              options[0].cache = false;
              console.log(JSON.stringify(options))
              return options;
            });

          // compression-webpack-plugin
          if (isProdEnv) {
            config
              .plugin('gzip')
              .tap(options => {
                if (!options[0]) return;
                options[0].cache = false;
                console.log(JSON.stringify(options))
                return options;
              });
          }
        }

        // disable copy plugin if no public dir
        if (asLib || !findExisting(context, ['public'])) {
          config.plugins.delete('copy');
        }
      });
    }
  };
};
