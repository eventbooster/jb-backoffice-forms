'use strict';



/**
* Directive for autoFormElements: Replaces itself with the corresponding input element
* as soon as the detailView directive has gotten the necessary data (type, required etc.)
* from the server through an options call
*/
angular
.module( 'jb.backofficeAutoFormElement', [] )
.directive( 'autoFormElement', [ '$compile', function( $compile ) {

	return {
		require		: [ 'autoFormElement', '^detailView' ]
		, link		: function( scope, element, attrs, ctrl ) {

			ctrl[ 0 ].init( element, ctrl[ 1 ] );

		}
		, controller	: 'AutoFormElementController'
		// If we leave it out and use $scope.$new(), angular misses detailView controller
		// as soon as we use it twice on one site. 
		, scope			: true
	};

} ] )


.controller( 'AutoFormElementController', [ '$scope', '$attrs', '$compile', '$rootScope', function( $scope, $attrs, $compile, $rootScope ) {

	var scope					= $scope
		,self					= this
		, element
		, detailViewController;


	/**
	* Is called when OPTION data is gotten in detailViewController; inits the replacement of the element
	*/
	self.optionUpdateHandler = function( data ) {

		if( !data || !data[ name ] ) {
			console.error( 'AutoFormElement: Can\'t update element, specs for field %o missing in %o', name, data );
			return;
		}

		var fieldSpec		= data[ name ];
		self.updateElement( fieldSpec );

		// Remove handler; if getOptions is called multiple times in detailViewController, 
		// it will throw an error as the function is not available any more.
		detailViewController.removeOptionsDataHandler( self.optionUpdateHandler );

	};


	self.init = function( el, detViewController ) {

		detailViewController = detViewController;

		// $scope.$on won't work with multiple detail-view directives on one page (controller detailView cannot be
		// found). Therefore use callbacks … :-)
		//console.error( 'devview %o for %o', detailViewController, el.data( 'for' ) );
		detailViewController.registerOptionsDataHandler( self.optionUpdateHandler );

		element = el;

	};


	var name = $attrs[ 'for' ];

	// field property updated in detailView (i.e. OPTION data gotten from serer)
	// Select element's attributes, compile fitting directive
	/*$scope.$on( 'fieldDataUpdate', function( ev, args ) {

		console.error( 'AutoFormElement: fieldDataUpdate %o', args );

		if( !args.fields || !args.fields[ name ] ) {
			console.error( 'AutoFormElement: Can\'t update element, specs for field %o missing in %o', name, args );
			return;
		}

		var fieldSpec		= args.fields[ name ];
		self.updateElement( fieldSpec );

	} );*/


	/**
	* Replaces element with the correct element of the type corresponding
	* to the current property's type (text, email etc.)
	*/
	self.updateElement = function( fieldSpec ) {

		var elementType;

		if( !fieldSpec || !fieldSpec.type ) {
			console.error( 'AutoFormElement: fieldSpec %o is missing type', fieldSpec );
			return;
		}

		switch( fieldSpec.type ) {
			case 'text':
				elementType = 'text';
				break;

			case 'number':
				elementType = 'text';
				break;

			case 'boolean':
				elementType = 'checkbox';
				break;

			case 'relation':
				elementType = 'relation';
				break;

			case 'language':
				elementType = 'language';
				break;

			case 'image':
				elementType = 'image';
				break;

			case 'datetime':
				elementType = 'dateTime';
				break;

			default:
				console.error( 'AutoFormElement: Unknown type %o', fieldSpec.type );

		}
		
		if( !elementType ) {
			console.error( 'AutoFormElement: elementType missing for element %o', element );
			return;
		}

		console.log( 'AutoFormElement: Create new %s from %o', elementType, fieldSpec );

		// camelCase to camel-case
		var dashedCasedElementType = elementType.replace( /[A-Z]/g, function( v ) { return '-' + v.toLowerCase(); } );


		// Pass OPTION data to directive :-)
		scope.optionData = fieldSpec;

		// Pass attributes of original directive to replacement
		scope.originalAttributes = $attrs;

		var newElement = $( '<div data-auto-' + dashedCasedElementType + '-input data-for=\'' + name + '\'></div>' );

		element.replaceWith( newElement );
		$compile( newElement )( scope );

	};

} ] );

