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
	console.log( 'HiddenInput: for is %o, read %o evals to %o', $attrs.for, $attrs.read, $scope.$parent.$eval( $attrs.read ) );
	if( !$attrs.hasOwnProperty( 'read' ) && $scope.$parent.$eval( $attrs.read ) ) {
		self.select = $attrs.for;
	}


	// Purpose 2: Store hidden values
	self.getSaveCalls = function() {

		var writeData = !$attrs.hasOwnProperty( 'write' ) || $scope.$parent.$eval( $attrs.write );

		console.log( 'HiddenInput: Get save calls; $attrs.data is %o, data-write is %o and evals to %o', $attrs.data, $attrs.write, $scope.$parent.$eval( $attrs.write ) );

		if( writeData && $attrs.data ) {

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

		return false;

	};


} ] );



/*.run( function( $templateCache ) {

	$templateCache.put( 'hiddenInputTemplate.html',
		'<div class=\'form-group form-group-sm\'>' +
			'<label data-backoffice-label></label>' +
			'<div class=\'col-md-9\'>' +
				'<input type=\'text\' data-ng-attr-id=\'{{ entityName }}-{{ data.name }}-label\' class=\'form-control input-sm\' data-ng-attrs-required=\'isRequired()\' data-ng-model=\'data.value\'/>' +
			'</div>' +
		'</div>'
	);

} );*/