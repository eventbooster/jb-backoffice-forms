/***
* Date/time/date time component for distributed back offices.
*/
( function() {

	'use strict';

	angular

	.module( 'jb.backofficeFormComponents' )

	.directive( 'backofficeDateComponent', [ function() {

		return {
			  controller		: 'BackofficeDateComponentController'
			, controllerAs		: '$ctrl'
			, bindToController	: true
			, template 			:
				'<div class="form-group form-group-sm">' +
					'<label data-backoffice-label data-label-identifier="{{$ctrl.label}}" data-is-required="$ctrl.isRequired()" data-is-valid="$ctrl.isValid()"></label>' +
						'<div data-ng-class="{ \"col-md-9\": !$ctrl.showTime(), \"col-md-5\": $ctrl.showTime()}">' +
							'<input type="date" class="form-control input-sm" data-ng-model="backofficeDateComponent.date">' +
						'</div>' +
					'<div class="col-md-4" data-ng-if="$ctrl.showTime()">' +
						'<input type="time" class="form-control input-sm" data-ng-model="$ctrl.date" />' +
					'</div>' +
				'</div>'
			, link				: function( scope, element, attrs, ctrl ) {
				ctrl.init( scope, element, attrs );
			}
			, scope: {
				  'propertyName' 	: '@for'
				, 'label'			: '@'
			}

		};

	} ] )

	.controller(
          'BackofficeDateComponentController'
        , [
              '$scope'
            , '$rootScope'
            , '$q'
            , 'APIWrapperService'
            , 'backofficeSubcomponentsService'
            , function( $scope, $rootScope, $q, APIWrapperService, componentsService) {

		var   self = this
			, _element
			, _originalData

			, _required
			, _showTime;

		self.date = undefined;

		self.init = function( scope, element, attrs ) {

			_element = element;
            componentsService.registerComponent(scope, this);

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


        self.registerAt = function(parent){
            parent.registerOptionsDataHandler(self.updateOptionsData.bind(self));
            parent.registerGetDataHandler(self.updateData.bind(self));
        };

		/**
		* Called with OPTIONS data 
		*/
		self.updateOptionsData = function( data ) {

			if( !data[ self.propertyName ] ) {
				console.error( 'BackofficeDateComponentController: Missing OPTIONS data for %o', self.propertyName );
				return;
			}

			_required = data[self.propertyName].required === true;
            _showTime = data[self.propertyName].time === true;
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

            var calls = [];
			function pad( nr ) {
				return nr < 10 ? '0' + nr : nr;
			}


			if( !_originalData && self.date ||
				_originalData && !self.date ||
				_originalData.getTime() !== self.date.getTime()
			) {

				var data = {};
				data[ self.propertyName ] = self.date.getFullYear() + '-' + pad( self.date.getMonth() + 1 ) + '-' + pad( self.date.getDate() ) + ' ' + pad( self.date.getHours() ) + ':' + pad( self.date.getMinutes() ) + ':' + pad( self.date.getSeconds() );

				calls.push({ data: data});

			}
			return calls;
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



	} ] );


} )();

