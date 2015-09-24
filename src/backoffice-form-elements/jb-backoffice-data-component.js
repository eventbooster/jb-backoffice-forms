/***
* Component for data (JSON) property
*/
( function() {

	'use strict';

	angular

	.module( 'jb.backofficeFormComponents' )

	.directive( 'backofficeDataComponent', [ function() {

		return {
			require				: [ 'backofficeDataComponent', '^detailView' ]
			, controller		: 'BackofficeDataComponentController'
			, controllerAs		: 'backofficeDataComponent'
			, bindToController	: true
			, templateUrl		: 'backofficeDataComponentTemplate.html'
			, link				: function( scope, element, attrs, ctrl ) {
				ctrl[ 0 ].init( element, ctrl[ 1 ] );
			}
			, scope: {
				'propertyName'		: '@for'
				, 'fields'			: '='
			}

		};

	} ] )

	.controller( 'BackofficeDataComponentController', [ '$scope', '$rootScope', '$q', 'APIWrapperService', function( $scope, $rootScope, $q, APIWrapperService ) {

		var self = this
			, _element
			, _detailViewController

			, _originalData;

		self.data = undefined;

		self.init = function( el, detailViewCtrl ) {

			_element = el;
			_detailViewController = detailViewCtrl;

			_detailViewController.registerOptionsDataHandler( self.updateOptionsData );
			_detailViewController.registerGetDataHandler( self.updateData );

		};



		/**
		* Check if fields variable passed is valid. Returns true if no error was detected, else throws an error.
		*/
		self.checkFields = function() {

			if( !angular.isArray( self.fields ) ) {
				throw new Error( 'BackofficeDataComponentController: fields passed is not an array: ' + JSON.stringify( self.fields ) );
			}


			self.fields.forEach( function( field ) {

				if( !angular.isObject( field ) ) {
					throw new Error( 'BackofficeDataComponentController: field passed is not an object: ' + JSON.stringify( field ) );
				}

				if( !field.name ) {
					throw new Error( 'BackofficeDataComponentController: field is missing name property: ' + JSON.stringify( field ) );
				}

			} );

			return true;

		};




		/**
		* Called with GET data
		*/
		self.updateData = function( data ) {

			if( !self.checkFields() ) {
				return;
			}

			if( data[ self.propertyName ] ) {

				_originalData 	= JSON.parse( data[ self.propertyName ] );
				self.data 		= JSON.parse( data[ self.propertyName ] );

			}


			// Set selected
			self.fields.forEach( function( field ) {

				// Add option to remove data
				field.values.push( undefined );

				// Set selected on field
				if( self.data[ field.name ] ) {
					field.selected = self.data[ field.name ];
				}

			} );

		};




		/**
		* Called with OPTIONS data 
		*/
		self.updateOptionsData = function( data ) {

			if( !data[ self.propertyName ] ) {
				console.error( 'BackofficeDataComponentController: Missing OPTIONS data for %o in %o', self.propertyName, data );
				return;
			}

			_detailViewController.register( self );

		};



		/**
		* Returns the fields that need to be selected on the GET call
		*/
		self.getSelectFields = function() {

			return [ self.propertyName ];

		};




		/**
		* Store/Delete files that changed.
		*/
		self.getSaveCalls = function() {


			// No changes
			var changed = false;
			self.fields.forEach( function( field ) {
				if( _originalData[ field.name ] !== field.selected ) {
					changed = true;
				}
			} );

			if( !changed ) {
				console.log( 'BackofficeDataComponentController: No changes made.' );
				return false;
			}

			var ret = angular.copy( _originalData );

			// Take ret and make necessary modifications.
			self.fields.forEach( function( field ) {

				// Value deleted
				if( field.selected === undefined && ret[ field.name ] ) {
					delete ret[ field.name ];
				}

				// Update value
				else {

					// Don't store empty fields (if newly created; if they existed before, 
					// they were deleted 5 lines above)
					if( field.selected !== undefined ) {
						ret[ field.name ] = field.selected;
					}

				}

			} );

			console.log( 'BackofficeDataComponentController: Store changes %o', ret );

			return {
				data	: {
					// Write on the data field
					data: JSON.stringify( ret )
				}
			};

		};


	} ] )



	.run( [ '$templateCache', function( $templateCache ) {

		$templateCache.put( 'backofficeDataComponentTemplate.html',
			'<div class=\'form-group form-group-sm\' data-ng-repeat="field in backofficeDataComponent.fields">' +
				//'{{ field | json }}' +
				'<label data-backoffice-label data-label-identifier=\'{{field.name}}\' data-is-required=\'false\' data-is-valid=\'true\'></label>' +
				'<div class=\'col-md-9\'>' +
					'<select class=\'form-control\' data-ng-options=\'value for value in field.values\' data-ng-model=\'field.selected\'></select>' +
				'</div>' +
			'</div>'
		);

	} ] );


} )();

