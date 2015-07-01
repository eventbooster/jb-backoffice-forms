var gulp		= require( 'gulp' )
	, jshint	= require( 'gulp-jshint' )
	, uglify	= require( 'gulp-uglify' )
	, rename	= require( 'gulp-rename' )
	, concat	= require( 'gulp-concat' )
	, order		= require( 'gulp-order' )
	, print		= require( 'gulp-print' );


var paths		= {
	jsSrc		: 'src/*/*.js'
	, jsDest	: 'dist/js'
};


gulp.task( 'scripts', function() {

	return gulp.src( [ paths.jsSrc ] )
		.pipe( order( [
			// As all other auto components inherit from jb-auto-input, it
			// must be first
			'autoinput/jb-auto-input.js',
			// Holds the module definition
			'backoffice-form-elements/jb-backoffice-form-components.js',
			'*/*.js'
			], { base: './src/' } ) ) // does not seem to work without base –
		.pipe( print() )
		.pipe( jshint() )
		.pipe( concat( 'jb-backoffice-forms.js' ) )
		.pipe( gulp.dest( paths.jsDest ) )
		.pipe( rename( 'jb-backoffice-forms.min.js' ) )
		.pipe( uglify() )
		.pipe( gulp.dest( paths.jsDest ) );

} );


gulp.task( 'watch', function() {

	gulp.watch( paths.jsSrc, [ 'scripts' ] );

} );

gulp.task( 'default', [ 'scripts', 'watch' ] );
