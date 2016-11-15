/**
* Component for a single image to
* - set focal points
*/
( function(undefined) {

	'use strict';

	var _module = angular.module( 'jb.formComponents' );

	/**
	* <input data-backoffice-image-component 
	*	data-for="enity">
	*/
	_module.directive( 'jbFormImageDetailComponent', [ function() {

		return {
			  controller		: 'JBFormImageDetailComponentController'
			, controllerAs		: 'backofficeImageDetailComponent'
			, bindToController	: true
			, link				: function( scope, element, attrs, ctrl ) {
				ctrl.init(scope, element, attrs);
			}
			, template :
            '<label data-backoffice-label data-label-identifier="{{backofficeImageDetailComponent.label}}" data-is-required="false" data-is-valid="true"></label>' +
			'<div class="col-md-9 backoffice-image-detail-component">' +
			    '<div class="image-container">' +
			        '<img data-ng-attr-src="{{backofficeImageDetailComponent.image[ backofficeImageDetailComponent.pathField ]}}" data-ng-click="backofficeImageDetailComponent.setFocalPointClickHandler($event)"/>' +
			        '<div class="focal-point-indicator" data-ng-if="backofficeImageDetailComponent.getFocalPoint()" data-ng-attr-style="top:{{backofficeImageDetailComponent.getFocalPointInPercent().y}}%;left:{{backofficeImageDetailComponent.getFocalPointInPercent().x}}%"></div>' +
                '</div>' +
                '<div data-ng-if="!backofficeImageDetailComponent.getFocalPoint()">{{ "web.backoffice.image.focalPointNotSet" | translate }}</div>' +
			    '<div data-ng-if="backofficeImageDetailComponent.getFocalPoint()">{{ "web.backoffice.image.focalPoint" | translate }}: {{ backofficeImageDetailComponent.getFocalPoint().x }} / {{backofficeImageDetailComponent.getFocalPoint().y}} </div>' +
			'</div>'
			, scope: {
                  pathField : '@'
                , label     : '@'
			}

		};

	} ] );

	_module.controller( 'JBFormImageDetailComponentController', [
          '$scope'
        , 'JBFormComponentsService'
        , function( $scope, componentsService) {

		var self = this
			, _element
			, _detailViewController

			//, _imageRenderingIds = []
			, _originalFocalPoint;


		self.image = {};


		self.init = function( scope, element, attrs ) {
            componentsService.registerComponent(scope, self);
		};

		self.isValid = function(){
			return true;
		};

        self.registerAt = function(parent){
            parent.registerGetDataHandler( self.updateData );
        };

			self.unregisterAt = function(parent){
				parent.unregisterGetDataHandler( self.updateData );
			};

		self.updateData = function( data ) {

			self.image = data;

			// Convert focalPoint to object, but only if it has a x and y property
			if( data.focalPoint ) {
				try {
					var focalPoint = JSON.parse( data.focalPoint );
					if( focalPoint.x && focalPoint.y ) {

						focalPoint.x = parseInt( focalPoint.x, 10 );
						focalPoint.y = parseInt( focalPoint.y, 10 );

						if( isNaN( focalPoint.x ) || isNaN( focalPoint.y ) ) {
							throw new Error( 'x or y property on focalPoint not an integer (or castable).' );
						}

						self.image.focalPoint = focalPoint;
					}
					else {
						throw new Error( 'Property x or y missing on ' + data.focalPoint );
					}
				}
				catch( e ) {
					console.error( 'JBFormImageDetailComponentController: Could not parse focalPoint ' + data.focalPoint + ': ' + e.message );
				}
			}
			_originalFocalPoint = angular.copy( data.focalPoint );

		};


		/**
		* Implies that path is /image/imageId
		*/
		self.getSelectFields = function() {

			// imageRendering: Renderings must be deleted when changing the focal point. 
			// See https://github.com/joinbox/eb-backoffice/issues/112
			return '*,mimeType.*,' + self.pathField;

		};

		self.getSaveCalls = function() {
			
			// Not set before and after (but not identical due to angular.copy)
			if( !_originalFocalPoint && !self.image.focalPoint ) {
				return false;
			}

			// Same x and y property
			var sameX		= _originalFocalPoint && self.image.focalPoint && _originalFocalPoint.x && self.image.focalPoint.x && self.image.focalPoint.x === _originalFocalPoint.x
				, sameY		= _originalFocalPoint && self.image.focalPoint && _originalFocalPoint.y && self.image.focalPoint.y && self.image.focalPoint.y === _originalFocalPoint.y;
			
			if( sameX && sameY ) {
				return false;
			}

			var calls = [];

			// PATCH on image automatically deletes imageRenderings. No need to do it manually.
			calls.push( {
				// It's always PATCH, as the image does exist
				  method	    : 'PATCH'
				, url			: ''
				, data			: {
					focalPoint	: JSON.stringify( self.image.focalPoint )
				}
			} );

			return calls;

		};




		/**
		* Click handler
		*/
		self.setFocalPointClickHandler = function( ev ) {
				
			var newFocalPoint = {
				x		: Math.round( ev.offsetX / ev.target.width * self.image.width )
				, y		: Math.round( ev.offsetY / ev.target.height * self.image.height )
			};
			console.log( 'JBFormImageDetailComponentController: Set focal point to ', JSON.stringify( newFocalPoint ) );

			self.image.focalPoint = newFocalPoint;

		};




		/**
		* Returns focalPoint as object with properties x and y – or false. 
		*/ 
		self.getFocalPoint = function() {
			
			if( !self.image || !self.image.focalPoint ) {
				return false;
			}

			return self.image.focalPoint;

		};



		/**
		* Returns % values of focal point. Needed for indicator.
		*/
		self.getFocalPointInPercent = function() {
			var focalPoint = self.getFocalPoint();

			if( !focalPoint ) {
				return false;
			}

			return {
				x		: Math.round( focalPoint.x / self.image.width * 100 )
				, y		: Math.round( focalPoint.y / self.image.height * 100 )
			};

		};

	} ] );


} )();

