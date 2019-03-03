const gulp = require('gulp');
const fs = require('fs');
const $ = require('gulp-load-plugins')();
const pngquant = require('imagemin-pngquant');
const mozjpeg = require('imagemin-mozjpeg');
const mergeStream = require('merge-stream');
const webpack = require('webpack-stream');
const webpackBundle = require('webpack');
const named = require('vinyl-named');
const browserSync = require('browser-sync');
const pug = require('pug');


// Sass tasks
gulp.task('sass', () => {

  return gulp.src(['./scss/**/*.scss'])
    .pipe($.plumber({
      errorHandler: $.notify.onError('<%= error.message %>')
    }))
    .pipe($.sassGlob())
    .pipe($.sourcemaps.init())
    .pipe($.sass({
      errLogToConsole: true,
      outputStyle: 'compressed',
      sourceComments: false,
      sourcemap: true,
      includePaths: [
        './scss',
        './node_modules/uikit/src/scss',
      ]
    }))
    .pipe($.autoprefixer({
      grid: true,
      browsers: ['last 2 versions', 'ie 11']
    }))
    .pipe($.sourcemaps.write('./map'))
    .pipe(gulp.dest('./docs/css'));
});

// JS Hint
gulp.task('eslint', () => {
  return gulp.src(['js/**/*.js'])
    .pipe($.eslint({ useEslintrc: true }))
    .pipe($.eslint.format());
});

// Package js
gulp.task('js', () => {
  let tmp = {};
  return gulp.src(['./js/**/*.js'])
    .pipe($.plumber({
      errorHandler: $.notify.onError('<%= error.message %>')
    }))
    .pipe(named())
    .pipe($.rename(function (path) {
      tmp[path.basename] = path.dirname;
    }))
    .pipe(webpack({
      mode: 'production',
      devtool: 'source-map',
      module: {
        rules: [
          {
            test: /\.js$/,
            exclude: /(node_modules)/,
            use: {
              loader: 'babel-loader',
              options: {
                presets: ['@babel/preset-env'],
                plugins: ['@babel/plugin-transform-react-jsx']
              }
            }
          }
        ]
      }
    }, webpackBundle))
    .pipe($.rename(function (path) {
      if (tmp[path.basename]) {
        path.dirname = tmp[path.basename];
      } else if ('.map' === path.extname && tmp[path.basename.replace(/\.js$/, '')]) {
        path.dirname = tmp[path.basename.replace(/\.js$/, '')];
      }
      return path;
    }))
    .pipe(gulp.dest('./docs/js'));
});

// Image min
gulp.task('imagemin', () => {
  return gulp.src('./img/**/*')
    .pipe($.imagemin([
      pngquant({
        quality: '65-80',
        speed: 1,
        floyd: 0
      }),
      mozjpeg({
        quality: 85,
        progressive: true
      }),
      $.imagemin.svgo(),
      $.imagemin.optipng(),
      $.imagemin.gifsicle()
    ]))
    .pipe(gulp.dest('./docs/img'));
});


// Copy library to bundle.
gulp.task('copylib', () => {
  return mergeStream(
    gulp.src([
      './node_modules/uikit/dist/js/uikit.min.js',
      './node_modules/uikit/dist/js/uikit-icons.min.js',
    ])
      .pipe(gulp.dest('docs/js'))
  );
});


gulp.task('pug', () => {
  const compiled = pug.compileFile('pug/index.pug');
  const html = compiled({
    title: 'Welcome to CJK4WP',
  });
  return $.file('index.html', html, { src: true })
    .pipe(gulp.dest('docs'));
});

// Watch BS
gulp.task('bs-watch', () => {
  return gulp.watch([
    'docs/css/**/*.css',
    'docs/js/**/*.js',
    'docs/img/**/*',
    'docs/**/*.html'
  ], gulp.task('bs-reload'));
});

// BrowserSync
gulp.task('browser-sync', () => {
  return browserSync({
    server: {
      baseDir: "./docs/",
      index: "index.html"
    },
    reloadDelay: 500
  });
});

// Reload browser sync.
gulp.task('bs-reload', (done) => {
  browserSync.reload();
  done();
});


// watch
gulp.task('watch', function () {
  // Make SASS
  gulp.watch('scss/**/*.scss', gulp.task('sass'));
  // Handle JSX
  gulp.watch(['js/**/*.js'], gulp.parallel('js', 'eslint'));
  // Minify Image
  gulp.watch('img/**/*', gulp.task('imagemin'));
});

// Build
gulp.task('build', gulp.parallel('js', 'sass', 'copylib', 'imagemin'));

// Browser Sync
gulp.task( 'bs', gulp.parallel( 'browser-sync', 'bs-watch' ) );

// Default Tasks
gulp.task('default', gulp.series('build', gulp.parallel('watch', 'bs') ));
