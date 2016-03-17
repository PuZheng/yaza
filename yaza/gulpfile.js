var gulp = require('gulp');
var sass = require('gulp-sass');
var rjs = require('gulp-requirejs');
var spawn = require('child_process').spawn;
 
gulp.task('build', function () {
    spawn('r.js', ['-o', 'build.js'], {
        stdio: 'inherit'
    });
});

gulp.task('sass', function () {
    gulp.src('static/sass/**/*.scss').pipe(sass()).pipe(gulp.dest('static/css'))
});

gulp.task('watch', function () {
    gulp.watch('static/sass/**/*.scss', 'sass');
})
