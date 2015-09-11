/***
* TBD!
*/


/**
* Component for integrating videos within an existing site (e.g. medium). 
* - Add, remove and edit an existing video.
* - Store relation on the parent entity.
*/
( function() {

	'use strict';

	angular

	.module( 'jb.backofficeFormComponents' )

	.directive( 'backofficeVideoComponent', [ function() {

		return {
			require				: [ 'backofficeVideoComponent', '^detailView' ]
			, controller		: 'BackofficeVideoComponentController'
			, controllerAs		: 'backofficeVideoComponent'
			, bindToController	: true
			, templateUrl		: 'backofficeVideoComponentTemplate.html'
			, link				: function( scope, element, attrs, ctrl ) {
				ctrl[ 0 ].init( element, ctrl[ 1 ] );
			}
			, scope: {
				'propertyName'		: '@for'
			}

		};

	} ] )

	.controller( 'BackofficeVideoComponentController', [ '$scope', '$rootScope', '$q', 'APIWrapperService', function( $scope, $rootScope, $q, APIWrapperService ) {

		var self = this
			, _element
			, _detailViewController

			, _originalData;

		self.images = [];

		self.init = function( el, detailViewCtrl ) {

			_element = el;
			_detailViewController = detailViewCtrl;

			_detailViewController.registerOptionsDataHandler( self.updateOptionsData );
			_detailViewController.registerGetDataHandler( self.updateData );

		};

		/**
		* Called with GET data
		*/
		self.updateData = function( data ) {
			
			console.error( data );

		};




		/**
		* Called with OPTIONS data 
		*/
		self.updateOptionsData = function( data ) {

			_detailViewController.register( self );

		};


		/**
		* Returns the fields that need to be selected on the GET call
		*/
		self.getSelectFields = function() {

			return [ self.propertyName + '.*' ];

		};




		/**
		* Store/Delete files that changed.
		*/
		self.getSaveCalls = function() {

			return false;

		};



		/**
		* Upload all image files
		*/
		self.beforeSaveTasks = function() {


		};






	} ] )



	.run( [ '$templateCache', function( $templateCache ) {

		$templateCache.put( 'backofficeVideoComponentTemplate.html',
			// data-backoffice-component: detailView waits with making the GET call until this element registered itself.
			'<div class=\'row\'>' +
				'<label data-backoffice-label data-label-identifier=\'{{backofficeImageComponent.propertyName}}\' data-is-required=\'false\' data-is-valid=\'true\'></label>' +
				'VIDEO' +
			'</div>'
		);

	} ] );


} )();

