/**
* Newer version of jb-auto-relation-input. Is not automatically replaced by auto-form-element any more, 
* but needs to be used manually. Gives more freedom in usage. 
* Don't use ngModel as it can't properly deep-watch, especially not through $render
*/
( function() {

	'use strict';

	angular

	.module( 'jb.backofficeFormComponents' )

	/**
	* <input data-backoffice-relation-component
	*	data-suggestion-template="[[property]]"
	* 	data-search-field="property"
	*	data-ng-model="model" // Optional
	*	data-for="enity">
	*/
	.directive( 'backofficeRelationComponent', [ function() {

		return {
			require				: [ 'backofficeRelationComponent', '^detailView' ]
			, controller		: 'BackofficeRelationComponentController'
			, controllerAs		: 'backofficeRelationComponent'
			, bindToController	: true
			, link				: function( scope, element, attrs, ctrl ) {
				ctrl[ 0 ].init( scope, element, attrs, ctrl[ 1 ] );
			}
			, scope: {
				'suggestionTemplate'	: '@'
				, 'searchField'			: '@'
				, 'propertyName'		: '@for'
			//	, 'relationModel'		: '=ngModel' Caused error since angular 1.4.fuckyou
			}

		};

	} ] )

	.controller( 'BackofficeRelationComponentController', [
            '$scope',
            '$compile',
            '$templateCache',
            'RelationInputService',
            'backofficeFormEvents',
            function( $scope, $compile, $templateCache, RelationInputService, formEvents ) {

		var self = this
			, _element
			, _detailViewController

			// Data gotten from options call: 
			// - is value required? 
			// - is relation deletable? 
			// - is it a multi or single select field?
			, _required
			, _deletable
			, _multiSelect

			// Entity can have an alias: Another name where we have to SAVE the data to, 
			// but cannot get data from – e.g. media -> medium for blogPosts (as medium 
			// is already taken for the main image)
			// If there is an alias, self.propertyName is the alias, _entityName the original
			// entity name to get data from.
			, _entityName

			// Original data gotten from server; needed to calculate differences
			// (when storing data)
			, _originalData;

		// Model for relationInput
		self.relationModel  = undefined;
        self.formEvents     = formEvents;



		/**
		* Called by link function
		*/
		self.init = function( scope, element, attrs, detailViewCtrl ) {

			_element = element;
			_detailViewController = detailViewCtrl;
            scope.$emit(self.formEvents.registerComponent, self);
		};

                self.registerAt = function(parent){
                    // Registers itself with detailViewController
                    parent.registerOptionsDataHandler( self.updateOptionsData );
                    parent.registerGetDataHandler( self.updateData );
                };

		/**
		* GET data gotten from detailView
		*/
		self.updateData = function( data ) {

			var modelValue;

			if( !data || !data[ self.propertyName ] ) {
				modelValue = [];
			}
			else {
				modelValue = angular.isArray( data[ self.propertyName ] ) ? data[ self.propertyName ] : [ data[ self.propertyName ] ];
			}

			self.relationModel = modelValue;
			// Store data in _originalData to calculate differences when saving
			_originalData = angular.copy( modelValue );

			console.log( 'BackofficeRelationComponentController: Model updated (updateData) to %o', self.relationModel );

		};




        /**
		 * Extracts the options data and injects the element itself.
		 */
		self.updateOptionsData = function( data ) {
			
			console.log( 'BackofficeRelationComponentController: Got options data %o', data[ self.propertyName ] );

			var elementData		= data[ self.propertyName ];

			_deletable			= elementData.originalRelation !== 'belongsTo';	
			_required			= elementData.required;
			_multiSelect		= elementData.relationType !== 'single';

			if( elementData.alias ) {
				_entityName = elementData.relation;
			}
			else {
				_entityName = self.propertyName;
			}
            // @todo: it might be better to insert the element
			self.replaceElement( _multiSelect, _deletable );
		};


		/**
		* Returns the select statement for the GET call
		* Use the RelationInputService from the relationInput to determine select fields depending on the 
		* suggestionTemplate.
		*/
		self.getSelectFields = function() {

			var selectFields				= RelationInputService.extractSelectFields( self.suggestionTemplate )

			// Select fields prefixed with the entity's name
				, prefixedSelectFields		= [];
			// @todo: this only makes sense if the property name is the same as the entity!
			selectFields.forEach( function( selectField ) {
				prefixedSelectFields.push( self.propertyName + '.' + selectField );
			} );

			return prefixedSelectFields;

		};

		/**
		 * Replaces itself with the relation-input element.
		 * Queries the template and injects the necessary values.
         * And replaces itself with the relation input and sets the endpoint based on the current entity name.
         *
         * @todo: resolve the endpoint using a service
		 */
		self.replaceElement = function( multiSelect, deletable ) {
            // This happens synchronously, and is therefore not a problem
			var template = $( $templateCache.get( 'backofficeRelationComponentTemplate.html') );

			template
				.find( '[data-relation-input]')
				.attr( 'data-relation-entity-endpoint', _entityName )
				.attr( 'data-relation-interactive', true )
				.attr( 'data-deletable', deletable )
				.attr( 'data-relation-entity-search-field', self.searchField )
				.attr( 'data-relation-suggestion-template', self.suggestionTemplate )
				.attr( 'data-ng-model', 'backofficeRelationComponent.relationModel' )
				.attr( 'data-multi-select', multiSelect );

			_element.replaceWith( template );
			$compile( template )( $scope );
		};


		self.isRequired = function() {
			return _required;
		};

		self.isValid = function() {

			// May return 1; therefore use !! to convert to bool.
			var valid = !!( !_required || ( _required && self.relationModel && self.relationModel.length ) );
			console.log( 'BackofficeRelationComponentController: isValid? %o', valid );
			return valid;

		};







		self.getSaveCalls = function() {

			var saveCalls = _multiSelect ? self.getMultiSelectSaveCalls() : self.getSingleSelectSaveCalls();

			console.log( 'BackofficeRelationComponentController: saveCalls are %o', saveCalls );
			return saveCalls;

		};






		/**
		* Creates requests for a single relation. 
		* No delete calls needed.
		*/
		self.getSingleSelectSaveCalls = function() {

			var calls = [];
			// Relations missing; happens if relations were not set on server nor changed
			// by user
			if( !self.relationModel ) {
				console.log( 'AutoRelationInputController: relationModel empty' );
				return calls;
			}


			// Element is required: It MUST be stored when main entity is created through POSTing to 
			// the main entity with id_entity. It may not be deleted, therefore on updating, a PATCH
			// call must be made to the main entity (and not DELETE/POST)
			if( _required ) {

				// No changes happened: return false
				if( self.relationModel && _originalData ) {

					// No values
					if( self.relationModel.length === 0 && _originalData.length === 0 ) {
						console.log( 'BackofficeRelationComponentController: No changes and no relations for required relation %o', self.propertyName );
						return calls;
					}

					// Same value
					if( self.relationModel.length && _originalData.length && self.relationModel[ 0 ] && _originalData[ 0 ] && self.relationModel[ 0 ].id === _originalData[ 0 ].id ) {
						console.log( 'BackofficeRelationComponentController: No changes on required relation %o', self.propertyName );
						return calls;
					}

				}




				var relationData = {};
				relationData[ 'id_' + self.propertyName ] = self.relationModel[ 0 ].id;


				// Creating main entity
				if( !_detailViewController.getEntityId() ) {

					return [{
						url			: false // Use main entity URL
						, method	: 'POST'
						, data		: relationData
					}];
				}

				// Updating main entity
				else {
					return [{
						url			: false // Use main entity URL
						, method	: 'PATCH'
						, data		: relationData
					}];
				}

			}


			// Element was removed
			if( self.relationModel.length === 0 && _originalData && _originalData.length !== 0 ) {
				return [{
					// self.propertyName must be first (before _detailViewController.getEntityName()) as the server handles stuff the same way – 
					// and ESPECIALLY for entities with an alias.
					url					: { 
						path			: '/' + self.propertyName + '/' + _originalData[ 0 ].id
						, mainEntity	: 'append'
					}
					, method			: 'DELETE'
				}];
			}

			// Update
			// When scope.data[ 0 ].id != _originalData[ 0 ].id 
			// Only [0] has to be checked, as it's a singleSelect
			if( self.relationModel.length ) {
				
				if( !_originalData || !_originalData.length || ( _originalData.length && self.relationModel[ 0 ].id !== _originalData[ 0 ].id ) ) {
				
					var data = {};
					data[ _detailViewController.fields[ self.propertyName ].relationKey ] = self.relationModel[ 0 ].id;

					// Post to /mainEntity/currentId/entityName/entityId, path needs to be entityName/entityId, 
					// is automatically prefixed by DetailViewController 
					return [{
						url					:  {
							path			:'/' + self.propertyName + '/' + self.relationModel[ 0 ].id
							, mainEntity	: 'append'
						}
						, method			: 'POST'
					}]
			
				}

			}

			// No changes
			return calls;

		};




		self.getMultiSelectSaveCalls = function() {

			// Deletes & posts

			// Select deleted and added elements
			// Just for console.log
			var deleted		= []
				, added		= [];

			var originalIds	= []
				, newIds	= []
				, calls		= [];

			// Make arrays of objects to arrays of ids
			if( self.relationModel && self.relationModel.length ) {
				self.relationModel.forEach( function( item ) {
					newIds.push( item.id );
				} );
			}
			if( _originalData && _originalData.length ) {
				_originalData.forEach( function( item ) {
					originalIds.push( item.id );
				} );
			}


			// Deleted: in _originalData, but not in newData
			originalIds.forEach( function( item ) {
				if( newIds.indexOf( item ) === -1 ) {
					deleted.push( item );
					calls.push( {
						method				: 'DELETE'
						, url				: {
							path			: self.propertyName + '/' + item
							, mainEntity	: 'append'
						}
					} );
				}
			}.bind( this ) );

			// Added: in newData, but not in _originalData

			newIds.forEach( function( item ) {
				if( originalIds.indexOf( item ) === -1 ) {
					added.push( item );
					calls.push( {
						method				: 'POST'
						, url				: {
							path			: '/' + self.propertyName + '/' + item
							, mainEntity	: 'append'
						}
					} );
				}
			}.bind( this ) );

			console.log( 'BackofficeRelationComponentController: Added %o, deleted %o – calls: %o', added, deleted, calls );

			return calls;

		};





	} ] )


	.run( [ '$templateCache', function( $templateCache ) {

		$templateCache.put( 'backofficeRelationComponentTemplate.html',
			'<div class=\'form-group\'>' +
				'<label data-backoffice-label ' +
					'data-label-identifier=\'{{backofficeRelationComponent.propertyName}}\' ' +
					'data-is-required=\'backofficeRelationComponent.isRequired()\' ' +
					'data-is-valid=\'backofficeRelationComponent.isValid()\'>' +
				'</label>' +
				'<div data-relation-input ' +
					'class=\'relation-select col-md-9\'>' +
				'</div>' +
			'</div>'
		);

	} ] );
} )();

