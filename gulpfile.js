var gulp		= require( 'gulp' )
	, jshint	= require( 'gulp-jshint' )
	, uglify	= require( 'gulp-uglify' )
	, rename	= require( 'gulp-rename' )
	, concat	= require( 'gulp-concat' )
	, order		= require( 'gulp-order' )
	, gulpPrint	= require( 'gulp-print' )
	, less		= require( 'gulp-less' );


var paths		= {
	//avoid loading spec files
	  jsSrc		: [
		    'src/*/*.js'
		  , '!src/*/*.spec.js']
	, jsDest	: 'dist/js'
	, cssSrc	: 'src/**/*.less'
	, cssDest	: 'dist/css'
};


gulp.task( 'scripts', function() {

	return gulp.src( paths.jsSrc )
		.pipe( order( [
			// As all other auto components inherit from jb-auto-input, it
			// must be first
			'autoinput/jb-auto-input.js',
			// Holds the module definition
			'backoffice-form-elements/jb-backoffice-form-components.js',
			'**/*.js'
			], { base: './src/' } ) ) // does not seem to work without base –
		.pipe( gulpPrint() )
		.pipe( jshint() )
		.pipe( concat( 'jb-backoffice-forms.js' ) )
		.pipe( gulp.dest( paths.jsDest ) )
		.pipe( rename( 'jb-backoffice-forms.min.js' ) )
		.pipe( uglify() )
		.pipe( gulp.dest( paths.jsDest ) );

} );




gulp.task( 'less', function() {

	return gulp.src( [ paths.cssSrc ] )
		.pipe( gulpPrint() )
		.pipe( less() )
		.pipe( concat( 'jb-backoffice-forms.css' ) )
		.pipe( gulp.dest( paths.cssDest ) );

} );

gulp.task( 'watch', function() {

	gulp.watch( paths.jsSrc, [ 'scripts' ] );
	gulp.watch( paths.cssSrc, [ 'less' ] );

} );

gulp.task( 'default', [ 'scripts', 'less', 'watch' ] );
