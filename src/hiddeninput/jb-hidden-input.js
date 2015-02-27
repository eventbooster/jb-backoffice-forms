/**
* Hidden input. Used to 
* - add select statements to detailView (use for attribute)
* - store hidden fields in detailView
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

	// Purpose 1: let user select any field passed through for
	self.select = $attrs.for;

	// Purpose 2: Store hidden values
	self.getSaveCalls = function() {

		console.log( 'HiddenInput: Get save calls; $attrs is %o', $attrs.data );

		if( $attrs.data ) {

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