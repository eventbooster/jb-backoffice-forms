/***
* Date/time/date time component for distributed back offices.
*/
( function() {

	'use strict';

	angular

	.module( 'jb.backofficeFormComponents' )

	.directive( 'backofficeDateComponent', [ function() {

		return {
			require				: [ 'backofficeDateComponent', '^detailView' ]
			, controller		: 'BackofficeDateComponentController'
			, controllerAs		: 'backofficeDateComponent'
			, bindToController	: true
			, templateUrl		: 'backofficeDateComponentTemplate.html'
			, link				: function( scope, element, attrs, ctrl ) {
				ctrl[ 0 ].init( element, ctrl[ 1 ] );
			}
			, scope: {
				'propertyName'		: '@for'
			}

		};

	} ] )

	.controller( 'BackofficeDateComponentController', [ '$scope', '$rootScope', '$q', 'APIWrapperService', function( $scope, $rootScope, $q, APIWrapperService ) {

		var self = this
			, _element
			, _detailViewController

			, _originalData

			, _required
			, _showTime;

		self.date = undefined;

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
			
			if( data[ self.propertyName ] ) {

				_originalData 	= new Date( data[ self.propertyName ] );
				self.date 		= new Date( data[ self.propertyName ] );

			}

		};




		/**
		* Called with OPTIONS data 
		*/
		self.updateOptionsData = function( data ) {

			if( !data[ self.propertyName ] ) {
				console.error( 'BackofficeDateComponentController: Missing OPTIONS data for %o', self.propertyName );
				return;
			}

			if(  data[ self.propertyName ].required ) {
				_required = true;
			}

			if(  data[ self.propertyName ].time ) {
				_showTime = true;
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

			function pad( nr ) {
				return nr < 10 ? '0' + nr : nr;
			}


			if( !_originalData && self.date ||
				_originalData && !self.date ||
				_originalData.getTime() !== self.date.getTime()
			) {

				var data = {};
				data[ self.propertyName ] = self.date.getFullYear() + '-' + pad( self.date.getMonth() + 1 ) + '-' + pad( self.date.getDate() ) + ' ' + pad( self.date.getHours() ) + ':' + pad( self.date.getMinutes() ) + ':' + pad( self.date.getSeconds() );

				return {
					method			: _detailViewController.getEntityId() ? 'PATCH' : 'POST'
					, data			: data
				};

			}

			return false;

		};



		self.isValid = function() {
			return !_required || ( _required && self.date );
		};


		self.isRequired = function() {
			return _required;
		};

		self.showTime = function() {
			return _showTime;
		};



	} ] )



	.run( [ '$templateCache', function( $templateCache ) {

		$templateCache.put( 'backofficeDateComponentTemplate.html',
			'<div class=\'form-group form-group-sm\'>' +
				'<label data-backoffice-label data-label-identifier=\'{{backofficeDateComponent.propertyName}}\' data-is-required=\'backofficeDateComponent.isRequired()\' data-is-valid=\'backofficeDateComponent.isValid()\'></label>' +
				// input[time] and input[date] are bound to the same model. Should work nicely.
				'<div data-ng-class=\'{ "col-md-9": !backofficeDateComponent.showTime(), "col-md-5": backofficeDateComponent.showTime()}\'>' +
					'<input type=\'date\' class=\'form-control input-sm\' data-ng-model=\'backofficeDateComponent.date\'>' +
				'</div>' +
				'<div class=\'col-md-4\' data-ng-if=\'backofficeDateComponent.showTime()\'>' +
					'<input type=\'time\' class=\'form-control input-sm\' data-ng-model=\'backofficeDateComponent.date\' />' +
				'</div>' +
			'</div>'
		);

	} ] );


} )();

