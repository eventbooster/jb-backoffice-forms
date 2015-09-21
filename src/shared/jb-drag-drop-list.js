
( function() {

	'use strict';

	angular

	.module( 'jb.backofficeShared', [] )

	.directive( 'dragDropList', [ function() {

		return {
				link					: function( $scope, element, attrs, ctrl ) {
						
					var dragDropPlugin;



					// Watch for additions to the DOM. On addition, re-initialize the drag and drop plugin. 
					// Needed if we have e.g. a list that's populated through ng-repeat: it's filled
					// with lis _after_ this function is invoked.
					var observer = new MutationObserver( function( mutations ) {
						
						var elementsAdded = 0;
						[].forEach.call( mutations, function( mutation ) {
							if( mutation.addedNodes && mutation.addedNodes.length ) {
								elementsAdded += mutation.addedNodes.length;
							}
						} );

						if( elementsAdded > 0 ) {
							dragDropPlugin.destroy();
							dragDropPlugin = new DragDropList( element[ 0 ].querySelectorAll( '[draggable="true"]' ) );
						}

					} );

					observer.observe( element[ 0 ], {
						childList: true
					} );

					$scope.$on( '$destroy', function() {
						observer.disconnect();
					} );



					// Initilaize drag and drop plugin
					dragDropPlugin = new DragDropList( element[ 0 ].querySelectorAll( '[draggable="true"]' ) );



				}
				, scope: {
				}
			};


	} ] );



	var DragDropList;

	// Hide stuff
	( function() {
	
		var _elements
			, _currentDragElement;


		DragDropList = function( elements ) {

			_elements = elements;

			console.log( 'DragDropList: Initialize for elements %o', elements );

			[].forEach.call( elements, function( element ) {
			
				element.setAttribute( 'draggable', true );
				addHandlers( element );

			} );

		};

		DragDropList.prototype.destroy = function() {

			console.log( 'DragDropList: Destroy event handlers on %o elements', _elements.length );

			[].forEach.call( _elements, function( element ) {
				removeHandlers( element );
			} );

		};


		function removeHandlers( element ) {
			
			element.removeEventListener( 'dragstart', dragStartHandler );
		
		}

		function addHandlers( element ) {

			element.addEventListener( 'dragstart', dragStartHandler );
			element.addEventListener( 'dragenter', dragEnterHandler );
			element.addEventListener( 'dragover', dragOverHandler );
			element.addEventListener( 'dragleave', dragLeaveHandler );
			element.addEventListener( 'drop', dropHandler );
			element.addEventListener( 'dragend', dragEndHandler );

		}

		function dragStartHandler( ev ) {

			// Use currentTarget instead of target: target my be a child element.
			ev.currentTarget.style.opacity = '0.4';
			_currentDragElement = ev.currentTarget;
			ev.dataTransfer.effectAllowed = 'move';
			ev.dataTransfer.setData( 'text/html', ev.currentTarget.outerHTML );

		}


		function dragEnterHandler( ev ) {
			ev.target.classList.add( 'drag-over' );
		}

		function dragLeaveHandler( ev ) {
			ev.target.classList.remove( 'drag-over' );
		}


		function dragOverHandler( ev ) {
			
			if ( ev.preventDefault ) {
					ev.preventDefault();
			}
			ev.dataTransfer.dropEffect = 'move';
			return false;

		}


		function dropHandler( ev ) {

			if (ev.stopPropagation) {
				ev.stopPropagation();
			}

			if ( _currentDragElement !== ev.currentTarget ) {

				console.log( 'dragDropList: Drop: %o after %o', _currentDragElement, ev.currentTarget );
				angular.element( ev.currentTarget ).after( _currentDragElement );
			
			}

			return false;

		}


		function dragEndHandler( ev ) {

			_currentDragElement.style.opacity = '1';
			_currentDragElement = undefined;
			// Make sure all .drag-over classes are removed
			[].forEach.call( _elements, function( element ) {
				element.classList.remove( 'drag-over' );
			} );

		}


	} )();



} )();

