var gulp		= require( 'gulp' )
	, jshint	= require( 'gulp-jshint' )
	, uglify	= require( 'gulp-uglify' )
	,rename		= require( 'gulp-rename' )
	, concat	= require( 'gulp-concat' );


var paths		= {
	jsSrc		: 'src/*/*.js'
	, jsDest	: 'dist/js'
};


gulp.task( 'scripts', function() {

	return gulp.src( paths.jsSrc )
		.pipe( jshint() )
		.pipe( concat( 'js-backoffice-forms.js' ) )
		.pipe( gulp.dest( paths.jsDest ) )
		.pipe( rename( 'js-backoffice-forms.min.js' ) )
		.pipe( uglify() )
		.pipe( gulp.dest( paths.jsDest ) );


} );


gulp.task( 'watch', function() {

	gulp.watch( paths.jsSrc, [ 'scripts' ] );

} );

gulp.task( 'default', [ 'scripts', 'watch' ] );
