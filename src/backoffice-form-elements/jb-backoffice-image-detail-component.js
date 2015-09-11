/**
* Component for a single image to
* - set focal points
*/
( function() {

	'use strict';

	angular

	.module( 'jb.backofficeFormComponents' )

	/**
	* <input data-backoffice-image-component 
	*	data-for="enity">
	*/
	.directive( 'backofficeImageDetailComponent', [ function() {

		return {
			require				: [ 'backofficeImageDetailComponent', '^detailView' ]
			, controller		: 'BackofficeImageDetailComponentController'
			, controllerAs		: 'backofficeImageDetailComponent'
			, bindToController	: true
			, templateUrl		: 'backofficeImageDetailComponentTemplate.html'
			, link				: function( scope, element, attrs, ctrl ) {
				ctrl[ 0 ].init( element, ctrl[ 1 ] );
			}
			, scope: {
				pathField		: '@'
			}

		};

	} ] )

	.controller( 'BackofficeImageDetailComponentController', [ '$scope', function( $scope ) {

		var self = this
			, _element
			, _detailViewController

			//, _imageRenderingIds = []

			, _originalFocalPoint;


		self.image = {};


		self.init = function( el, detailViewCtrl ) {
			_element = el;
			_detailViewController = detailViewCtrl;

			_detailViewController.registerOptionsDataHandler( self.updateOptionsData );
			_detailViewController.registerGetDataHandler( self.updateData );

		};

		self.updateOptionsData = function( data ) {
			_detailViewController.register( self );
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
					console.error( 'BackofficeImageDetailComponentController: Could not parse focalPoint ' + data.focalPoint + ': ' + e.message );
				}
			}


			// Store IDs of imageRenderings
			/*if( data.imageRendering && data.imageRendering.length ) {
				_imageRenderingIds = data.imageRendering.map( function( item ) {
					return item.id;
				} );
			}*/

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
				method			: 'PATCH'
				, url			: '/' + _detailViewController.getEntityName() + '/' + _detailViewController.getEntityId()
				, data			: {
					focalPoint	: JSON.stringify( self.image.focalPoint )
				}
			} );


			// Remove existing image renderings
			/*_imageRenderingIds.forEach( function( imageRenderingId ) {
				calls.push( {
					method			: 'DELETE'
					, url			: '/imageRendering/' + imageRenderingId
				} );
			} );*/

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
			console.log( 'BackofficeImageDetailComponentController: Set focal point to ', JSON.stringify( newFocalPoint ) );

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

	} ] )



	.run( [ '$templateCache', function( $templateCache ) {

		$templateCache.put( 'backofficeImageDetailComponentTemplate.html',

			'<label data-backoffice-label data-label-identifier=\'image\' data-is-required=\'false\' data-is-valid=\'true\'></label>' +
			'<div class=\'col-md-9 backoffice-image-detail-component\'>' +
				'<div class=\'image-container\'>' +
					'<img data-ng-attr-src=\'{{backofficeImageDetailComponent.image[ backofficeImageDetailComponent.pathField ]}}\' data-ng-click=\'backofficeImageDetailComponent.setFocalPointClickHandler($event)\'/>' +
					'<div class=\'focal-point-indicator\' data-ng-if=\'backofficeImageDetailComponent.getFocalPoint()\' data-ng-attr-style=\'top:{{backofficeImageDetailComponent.getFocalPointInPercent().y}}%;left:{{backofficeImageDetailComponent.getFocalPointInPercent().x}}%\'></div>' +
				'</div>' +
				'<div data-ng-if=\'!backofficeImageDetailComponent.getFocalPoint()\'>{{ \'web.backoffice.image.focalPointNotSet\' | translate }}</div>' +
				'<div data-ng-if=\'backofficeImageDetailComponent.getFocalPoint()\'>{{ \'web.backoffice.image.focalPoint\' | translate }}: {{ backofficeImageDetailComponent.getFocalPoint().x }} / {{backofficeImageDetailComponent.getFocalPoint().y}} </div>' +
			'</div>'

		);

	} ] );


} )();

