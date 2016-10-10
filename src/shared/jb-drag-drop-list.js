
( function() {

	'use strict';

	angular

	.module( 'jb.formComponents')

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

			var oldOrder = getElementIndex( _currentDragElement );

			if ( _currentDragElement !== ev.currentTarget ) {

				console.log( 'dragDropList: Drop: %o after %o', _currentDragElement, ev.currentTarget );
				angular.element( ev.currentTarget ).after( _currentDragElement );

				// Dispatch orderChange event on li
				// Necessary to change the order on a possible parent directive
				var orderChangeEvent = new CustomEvent( 'orderChange', { 
					bubbles			: true
					, detail		:{	
						oldOrder	: oldOrder
						, newOrder	: getElementIndex( ev.currentTarget ) + 1
					}
				} );
				ev.currentTarget.dispatchEvent( orderChangeEvent );
			
			}

			return false;

		}


		/**
		* Returns the index (position) of an element within its parent element. 
		* @param <String> selector: Only respect sibling elements of element that match the selector (TBD)
		*/
		function getElementIndex( element ) {
			var siblings	= element.parentNode.childNodes
				, index		= 0;
			for( var i = 0; i < siblings.length; i++ ) {
				if( element === siblings[ i ] ) {
					return index;
				}
				if( siblings[ i ].nodeType === 1 ) {
					index++;
				}
			}
			return -1;
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

