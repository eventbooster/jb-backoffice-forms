/***
* Media group component: Displays videos and images in a list that may be sorted 
* by drag-and-drop.
*/
( function() {

	'use strict';

	var _module = angular.module( 'jb.formComponents' )

	.directive( 'jbFormMediaGroupComponent', [ function() {

		return {
			//require				: 'JBFormMediaGroupComponentController'
			controller		: 'JBFormMediaGroupComponentController'
			, controllerAs		: 'backofficeMediaGroupComponent'
			, bindToController	: true
			, templateUrl		: 'backofficeMediaGroupComponentTemplate.html'
			, link				: function( scope, element, attrs, ctrl ) {
				ctrl.init( element );
			}
			, scope: {
				'propertyName'		: '@for'
				, serviceName		: '@'
			}

		};

	} ] )

	.controller( 'JBFormMediaGroupComponentController', [ '$scope', '$rootScope', '$q', 'APIWrapperService', 'JBFormComponentsService', function( $scope, $rootScope, $q, APIWrapperService, componentsService ) {

		var self = this
			, _element
			, _detailViewController
			, _componentsService = componentsService

			, _originalData = []

			, _selectFields = [ '*', 'video.*', 'video.videoType.*', 'image.*', 'group_medium.*', 'group.*' ];


		self.media = [];


		/**
		* Model that the relation-input («add medium») is bound to. 
		* Watch it to see what new medium is added; after change, remove it's items – should
		* therefore always have a length of 0 or 1. 
		*/
		self.addMediumModel = [];



		self.init = function( el ) {

			_element = el;

			//_detailViewController.registerOptionsDataHandler( self.updateOptionsData );
			//_detailViewController.registerGetDataHandler( self.updateData );

			_componentsService.registerComponent($scope, this);

			self.setupAddMediumModelWatcher();

			self.setupOrderChangeListener();

		};


		self.registerAt = function(parent) {
			parent.registerOptionsDataHandler(self.updateOptionsData.bind(self));
			parent.registerGetDataHandler(self.updateData.bind(self));
		};


		/**
		* Sort media by their sortOrder (stored on group_medium[0].sortOrder)
		*/
		function sortMedia( a, b ) {

			// #TODO: Don't use index 0, it may belong to another group_medium
			var aOrder 		= a.group_medium[ 0 ].sortOrder
				, bOrder 	= b.group_medium[ 0 ].sortOrder;

			return aOrder < bOrder ? -1 : 1;

		}



		/**
		* Called with GET data
		*/
		self.updateData = function( data ) {
			
			if( data[ self.propertyName ] ) {

				var media 		= data[ self.propertyName ] || [];

				try {
					self.media = media.sort( sortMedia );
				} catch( err ) {
					console.error( 'JBFormMediaGroupComponentController: Properties group_medium, it\'s items or sortOrder missing' );
					self.media = media;
				}

				_originalData 	= angular.copy( self.media );

			}

		};




		/**
		* Listen to orderChange events that are fired on the lis through the drag-droplist directive, 
		* update array/model accordingly.
		*/
		self.setupOrderChangeListener = function() {

			// Called whenever drag-drop-list directive causes the order to change. 
			// Re-order the media array.
			_element[ 0 ].addEventListener( 'orderChange', function( ev ) {

				self.media.splice( ev.detail.newOrder, 0, self.media.splice( ev.detail.oldOrder, 1 )[ 0 ] );

			} );

		};




		/**
		* Watch for changes on addMediumModel. When data is added,
		* add it to self.media.
		*/
		self.setupAddMediumModelWatcher = function() {

			$scope.$watch( function() {
				return self.addMediumModel;
			}, function( newVal ) {

				if( self.addMediumModel.length === 1 ) {

					self.addMedium( newVal[ 0 ].id );

					// Re-set model
					self.addMediumModel = [];					
				}

			}, true );

		};


		/**
		* Adds a medium to self.media (is the de-facto click handler for
		* the add medium dropdown).
		*/
		self.addMedium = function( mediumId ) {

			// Check for duplicates
			if( 
				self.media.filter( function( item ) {
					return item.id === mediumId;
				} ).length > 0 
			) {
				console.error( 'JBFormMediaGroupComponentController: Trying to add duplicate with id', mediumId );
				return;
			}

			APIWrapperService.request( {
				url				: '/' + (self.serviceName ? self.serviceName + '.' : '') + self.propertyName + '/' + mediumId
				, method		: 'GET'
				, headers		: {
					select		: '*,video.*,video.videoType.*,image.*,group.*,group_medium.*'
				}
			} )
			.then( function( data ) {
				
				self.media.push( data );

			}, function( err ) {

				console.error( 'JBFormMediaGroupComponentController: Could not get data for medium with id %o: %o', mediumId, err );

				$rootScope.$broadcast( 'notification', {
					'type'		: 'error'
					, 'message'	: 'web.backoffice.detail.loadingError'
					, variables	: {
						errorMessage: err
					}
				} );

			} );


		};



		/**
		* Called with OPTIONS data 
		*/
		self.updateOptionsData = function( data ) {

			//_detailViewController.register( self );

		};



		/**
		* Returns the fields that need to be selected on the GET call
		*/
		self.getSelectFields = function() {

			return _selectFields.map( function( item ) {
				return (self.serviceName ? self.serviceName + ':' : '') + self.propertyName + '.' + item;
			} );

		};




		/**
		* Store/Delete files that changed.
		*/
		self.getSaveCalls = function() {

			console.error( _originalData );

			// Get IDs of entities _before_ anything was edited and curent state.
			var oldIds = _originalData.map( function( item ) {
					return item.id;
				} )
			, newIds = self.media.map( function( item ) {
					return item.id;
				} );



			// Get deleted and created medium relations
			var created = []
				, deleted = [];
			
			newIds.forEach( function( item ) {
				if( oldIds.indexOf( item ) === -1 ) {
					created.push( item );
				}
			} );

			oldIds.forEach( function( item ) {
				if( newIds.indexOf( item ) === -1 ) {
					deleted.push( item );
				}
			} );



			var calls = [];

			// 1. Delete relations
			deleted.forEach( function( item ) {
				calls.push( {
					method		: 'DELETE'
					, url		: (self.serviceName ? self.serviceName + '.' : '') + self.propertyName + '/' + item
				} );
			} );


			// 2. Create relations
			created.forEach( function( item ) {
				calls.push( {
					method		: 'POST'
					, url		: (self.serviceName ? self.serviceName + '.' : '') + self.propertyName + '/' + item
				} );
			} );


			return calls;

		};




		/**
		* Returns highest sortOrder on current media. 
		*/
		function getHighestSortOrder() {

			var highestSortOrder = -1;
			self.media.forEach( function( medium ) {

				if( medium.group_medium && medium.group_medium.length ) {
					highestSortOrder = Math.max( highestSortOrder, medium.group_medium[ 0 ].sortOrder );
				}

			} );

			return highestSortOrder;

		}



		/**
		* Store order. All media must first have been saved (getSaveCalls was called earlier)
		*/
		self.afterSaveTasks = function(entityId) {


			// No (relevant) changes? Make a quick check.
			// TBD.
			/*if( _originalData.length === self.media.length ) {

				var sameOrder = false;
				_originalData.forEach( function( item, index ) {
					if( item.sortOrder === )
				} );

			}*/


			var highestSortOrder 	= getHighestSortOrder()
				, calls 			= [];

			// Update orders
			self.media.forEach( function( medium ) {

				calls.push( APIWrapperService.request( {
					url				: '/media.group/' + entityId + '/media.medium/' + medium.id
					, method		: 'PATCH'
					, data			: {
						sortOrder	: ++highestSortOrder
					}
				} ) );
				
			} );

			return $q.all( calls );

		};




		self.isValid = function() {
			return true;
		};


		self.isRequired = function() {
			return false;
		};


		self.removeMedium = function( medium ) {

			self.media.splice( self.media.indexOf( medium ), 1 );

		};


	} ] )



	.run( [ '$templateCache', function( $templateCache ) {

		$templateCache.put( 'backofficeMediaGroupComponentTemplate.html',

			'<div class=\'backoffice-media-group-component\'>' +

				'<div class=\'row\'>' +
					'<div class=\'col-md-12\'>' +

						'<ol class=\'clearfix\' data-drag-drop-list>' +
							'<li data-ng-repeat=\'medium in backofficeMediaGroupComponent.media\' draggable=\'true\'>' +
								'<div data-ng-if=\'medium.image\'>' +
									'<button data-ng-click=\'backofficeMediaGroupComponent.removeMedium(medium)\'>&times;</button>' +
									'<img data-ng-attr-src=\'{{medium.image.url}}\'>' +
								'</div>' +
								'<div data-ng-if=\'medium.video && medium.video.videoType.identifier === "youtube"\'>' +
									'<button data-ng-click=\'backofficeMediaGroupComponent.removeMedium(medium)\'>&times;</button>' +
									'<img data-ng-attr-src=\'http://img.youtube.com/vi/{{medium.video.uri}}/0.jpg\'>' +
								'</div>' +
							'</li>' +
						'</ol>' +

					'</div>' +
				'</div>' +

				'<div class=\'row\'>' +
					'<div class=\'col-md-12\'>' +

						'<p>Add Medium:</p>' +
						'<div class="relation-select" ' +
							'data-relation-input ' +
							'data-ng-attr-data-relation-entity-endpoint="{{backofficeMediaGroupComponent.serviceName}}.{{backofficeMediaGroupComponent.propertyName}}" ' +
							'data-relation-interactive="false" ' +
							'relation-is-deletable="false" ' +
							'relation-is-readonly="false"' +
							'relation-is-creatable="true"' +
							'data-relation-entity-search-field="title" ' +
							'data-relation-suggestion-template="[[title]] <img src=\'[[image.url]]\'/>" ' +
							'data-ng-model="backofficeMediaGroupComponent.addMediumModel" ' +
							'data-multi-select="true">' +
						'</div>' +

					'</div>' +
					/*'<div class=\'col-md-3\'>' +

						'<button class="btn btn btn-success" data-ng-attr-ui-sref="app.detail({entityName:\'{{backofficeMediaGroupComponent.propertyName}}\',entityId:\'new\'})">{{ \'web.backoffice.group.createMedium\' | translate }}</button>' +

					'</div>' +*/
				'</div>' +
			'</div>'

		);

	} ] );


} )();

