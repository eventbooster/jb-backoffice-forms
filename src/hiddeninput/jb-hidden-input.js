/**
* Hidden input. Used to 
* - add select statements to detailView (use for attribute)
* - store hidden fields in detailView
* 
* Pass 
* - data-read="expression" to only read data if a certain condition is met or
* - data-write="expression" to only write data if a certain condition is met
* Default for both (if not passed) is true. Evals against $scope.$parent.
*/

'use strict';


angular
.module( 'jb.backofficeHiddenInput', [] )

/**
* Directive for an autoFormElement of type 'text'
*/
.directive( 'hiddenInput', [ function() {

	return {
		require			: [ 'hiddenInput', '^detailView' ]
		, controller	: 'HiddenInputController'
		, link			: function( scope, element, attrs, ctrl) {
			ctrl[ 0 ].init( element, ctrl[ 1 ] );
		}
		// Let the user get stuff from the $parent scope to use 
		// as value
		, scope			: true
	};

} ] )

.controller( 'HiddenInputController', [ '$scope', '$attrs', function( $scope, $attrs ) {

	var self			= this
		, element
		, detailViewController;

	self.init = function( el, detViewCtrl ) {

		element = el;
		detailViewController = detViewCtrl;

		// Register myself at detailViewController
		detailViewController.register( self );

	};

	self.isValid = function() {
		console.log( 'HiddenInputController: isValid? yes.' );
		return true;
	};


	// Purpose 1: let user select any field passed through for
	// If the elemen's data-read attribute evals to false, don't add the for
	// attribute to the select statement. 
	// This is e.g required for nested sets where we need to *set* «parentNode» or «after» or «before»,
	// but can't select those properties because they're virtual.	
	console.log( 'HiddenInput: for is %o, read %o (hasProperty %o) evals to %o', $attrs.for, $attrs.read, $attrs.hasOwnProperty( 'read' ), $scope.$parent.$eval( $attrs.read ) );
	if( !$attrs.hasOwnProperty( 'read' ) || $scope.$parent.$eval( $attrs.read ) ) {
		self.select = $attrs.for;
		console.log( 'HiddenInput: select is %o', self.select );
	}


	// Purpose 2: Store hidden values
	self.getSaveCalls = function() {

		var writeData = !$attrs.hasOwnProperty( 'write' ) || $scope.$parent.$eval( $attrs.write );

		console.log( 'HiddenInput: Get save calls; $attrs.data is %o, writeData is %o, data-write is %o and evals to %o', $attrs.data, writeData, $attrs.write, $scope.$parent.$eval( $attrs.write ) );

		if( writeData && $attrs.data ) {

			var isRelation = $attrs.for && $attrs.for.indexOf( '.' ) > -1;

			// If there's a star in the for attribute, we're working with a relation. 
			// Store it through POSTing to /entity/id/entity/id instead of sending data.
			// If you should ever change this behaviour, make sure that you can still edit
			// discounts on articles in the Cornèrcard back office. 
			if( isRelation ) {

				var entityName 		= $attrs.for.substring( 0, $attrs.for.lastIndexOf( '.' ) )
					, url			= entityName + '/' + $attrs.data;

				console.log( 'HiddenInput: Store relation %o', url );

				return {
					url			: url
					, method	: 'POST'
				};


			}
			else {

				// Compose data
				var saveData = {};
				saveData[ $attrs.for ] = $attrs.data;

				console.log( 'HiddenInput: Store data %o', saveData );

				return {
					url			: ''
					, data		: saveData
					// Method: PATCH if entity already has an ID, else POST
					, method	: detailViewController.getEntityId() ? 'PATCH' : 'POST'
				};

			}

		}

		return false;

	};


} ] );