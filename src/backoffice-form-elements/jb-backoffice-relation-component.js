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
				ctrl[ 0 ].init( element, ctrl[ 1 ] );
			}
			, scope: {
				'suggestionTemplate'	: '@'
				, 'searchField'			: '@'
				, 'propertyName'		: '@for'
				, 'relationModel'		: '=ngModel'
			}

		};

	} ] )

	.controller( 'BackofficeRelationComponentController', [ '$scope', '$compile', '$templateCache', 'RelationInputService', function( $scope, $compile, $templateCache, RelationInputService ) {

		var self = this
			, element
			, detailViewController

			// Data gotten from options call: 
			// - is value required? 
			// - is relation deletable? 
			// - is it a multi or single select field?
			, required
			, deletable
			, multiSelect

			// Original data gotten from server; needed to calculate differences
			// (when storing data)
			, originalData;


		
		// Model for relationInput
		self.relationModel = undefined;



		/**
		* Called by link function
		*/
		self.init = function( el, detailViewCtrl ) {

			element = el;
			detailViewController = detailViewCtrl;

			// Registers itself with detailViewController
			detailViewController.registerOptionsDataHandler( self.updateOptionsData );
			detailViewController.registerGetDataHandler( self.updateData );

		};





		/**
		* GET data gotten from detailView
		*/
		self.updateData = function( data ) {
			var modelValue = angular.isArray( data[ self.propertyName ] ) ? data[ self.propertyName ] : [ data[ self.propertyName ] ];
			self.relationModel = modelValue; 

			// Store data in originalData to calculate differences when saving
			originalData = angular.copy( modelValue );

			console.log( 'BackofficeRelationComponentController: Model updated (updateData) to %o', self.relationModel );
		};




		/**
		* Parse option data gotten from detailViewController
		*/
		self.updateOptionsData = function( data ) {
			
			console.log( 'BackofficeRelationComponentController: Got options data %o', data[ self.propertyName ] );

			var elementData		= data[ self.propertyName ];

			deletable			= elementData.originalRelation !== 'belongsTo';	
			required			= elementData.required;
			multiSelect			= elementData.relationType !== 'single';

			self.replaceElement( multiSelect, deletable );

			// Now let detailViewController know we're ready to get GET data
			detailViewController.register( self );

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
			
			selectFields.forEach( function( selectField ) {
				prefixedSelectFields.push( self.propertyName + '.' + selectField );
			} );

			return prefixedSelectFields;

		};



		/**
		* Replaces itself with the relation-input element
		*/
		self.replaceElement = function( multiSelect, deletable ) {

			var template = $( $templateCache.get( 'backofficeRelationComponentTemplate.html') );

			template
				.find( '[data-relation-input]')
				.attr( 'data-relation-entity-endpoint', self.propertyName )
				.attr( 'data-relation-interactive', true )
				.attr( 'data-deletable', deletable )
				.attr( 'data-relation-entity-search-field', self.searchField )
				.attr( 'data-relation-suggestion-template', self.suggestionTemplate )
				.attr( 'data-ng-model', 'backofficeRelationComponent.relationModel' )
				.attr( 'data-multi-select', multiSelect )
				.attr( 'data-deletable', deletable );

			element.replaceWith( template );
			$compile( template )( $scope );

		};


		self.isRequired = function() {
			return required;
		};

		self.isValid = function() {

			// May return 1; therefore use !! to convert to bool.
			var valid = !!( !required || ( required && self.relationModel && self.relationModel.length ) );
			console.log( 'BackofficeRelationComponentController: isValid? %o', valid );
			return valid;

		};







		self.getSaveCalls = function() {

			var saveCalls = multiSelect ? self.getMultiSelectSaveCalls() : self.getSingleSelectSaveCalls();

			console.log( 'BackofficeRelationComponentController: saveCalls are %o', saveCalls );
			return saveCalls;

		};




		/**
		* Creates requests for a single relation. 
		* No delete calls needed.
		*/
		self.getSingleSelectSaveCalls = function() {

			// Relations missing; happens if relations were not set on server nor changed
			// by user
			if( !self.relationModel ) {
				console.log( 'AutoRelationInputController: relationModel empty' );
				return false;
			}


			// Element is required: It must be stored when main entity is created through POSTing to 
			// the main entity with id_entity. It may not be deleted, therefore on updating, a PATCH
			// call must be made to the main entity (and not DELETE/POST)
			if( required ) {

				var relationData = {};
				relationData[ 'id_' + self.propertyName ] = self.relationModel[ 0 ].id;

				// Creating main entity
				if( !detailViewController.getEntityId() ) {

					return {
						url			: false // Use main entity URL
						, method	: 'POST'
						, data		: relationData
					};
				}

				// Updating main entity
				else {
					return {
						url			: false // Use main entity URL
						, method	: 'PATCH'
						, data		: relationData
					};
				}

			}


			// Element was removed
			if( self.relationModel.length === 0 && originalData && originalData.length !== 0 ) {
				return {
					url			: self.propertyName + '/' + originalData[ 0 ].id
					, method	: 'DELETE'
				};
			}

			// Update
			// When scope.data[ 0 ].id != originalData[ 0 ].id 
			// Only [0] has to be checked, as it's a singleSelect
			if( self.relationModel.length ) {
				if( !originalData || ( originalData.length && self.relationModel[ 0 ].id !== originalData[ 0 ].id ) ) {
				
					var data = {};
					data[ detailViewController.fields[ self.propertyName ].relationKey ] = self.relationModel[ 0 ].id;

					// Post to /mainEntity/currentId/entityName/entityId, path needs to be entityName/entityId, 
					// is automatically prefixed by DetailViewController 
					return {
						url			:  self.propertyName + '/' + self.relationModel[ 0 ].id
						, method	: 'POST'
					};
			
				}
			}

			// No changes
			return false;

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
			if( originalData && originalData.length ) {
				originalData.forEach( function( item ) {
					originalIds.push( item.id );
				} );
			}


			// Deleted: in originalData, but not in newData
			originalIds.forEach( function( item ) {
				if( newIds.indexOf( item ) === -1 ) {
					deleted.push( item );
					calls.push( {
						method			: 'DELETE'
						, url			: self.propertyName + '/' + item
					} );
				}
			}.bind( this ) );

			// Added: in newData, but not in originalData
			newIds.forEach( function( item ) {
				if( originalIds.indexOf( item ) === -1 ) {
					added.push( item );
					calls.push( {
						method		: 'POST'
						, url		: self.propertyName + '/' + item
					} );
				}
			}.bind( this ) );

			console.log( 'BackofficeRelationComponentController: Added %o, deleted %o – calls: %o', added, deleted, calls );

			if( calls.length === 0 ) {
				return false;
			}

			return calls;

		};





	} ] )


	.run( function( $templateCache ) {

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

	} );




} )();

