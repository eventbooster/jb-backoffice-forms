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
		    'src/*.js'
          , 'src/**/*.js'
          , '!src/deprecated/*'
		  , '!src/*.spec.js'
          , '!src/**/*.spec.js' ]
	, jsDest	: 'dist/js'
	, cssSrc	: 'src/**/*.less'
	, cssDest	: 'dist/css'
};


gulp.task( 'scripts', function() {

	return gulp.src( paths.jsSrc )
		.pipe( order( [
			  'jb-backoffice-forms.js'
			, 'jb-form-components.js'
			, 'jb-form-events.js'
			, '**/*.js'
			], { base: './src/' } ) ) // does not seem to work without base –
		.pipe( gulpPrint() )
		.pipe( jshint() )
		.pipe( concat( 'jb-backoffice-forms.js' ) )
        .pipe( gulp.dest( paths.jsDest ) )
		.pipe( uglify() )
        .pipe( rename( 'jb-backoffice-forms.min.js' ) )
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
